import { pipelines, Stack, StackProps, Stage } from 'aws-cdk-lib';
import { IRepository } from 'aws-cdk-lib/aws-ecr';
import {
  CodeBuildStep,
  CodePipeline,
  CodePipelineSource,
  ShellStep,
} from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import {
  CDK_SYNTH_OUTPUT_DIRECTORY,
  CDK_SYNTH_STEP,
  dockerBuildCommands,
  CDK_GITHUB_REPO,
  GITHUB_TOKEN,
  stageTitleCase,
  SERVER_GITHUB_REPO,
} from './utils';
import { LinuxBuildImage } from 'aws-cdk-lib/aws-codebuild';
import { ISecurityGroup, IVpc } from 'aws-cdk-lib/aws-ec2';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { DeploymentStack } from './deployment-stack';

interface DockerImageStackProps extends StackProps {
  stageName: string;
  imageTag: string;
  ecr: IRepository;
  deployServer: boolean;
  vpc?: IVpc;
  rdsSecret?: ISecret;
  rdsSecurityGroup?: ISecurityGroup;
}

export class DockerImageStack extends Stack {
  constructor(scope: Construct, id: string, props: DockerImageStackProps) {
    super(scope, id, props);
    const stageName = props.stageName;
    const stageTitle = stageTitleCase(stageName);

    const pipeline = new CodePipeline(this, `${stageTitle}Pipeline`, {
      pipelineName: `${stageName}-pipeline`,
      synth: new ShellStep(CDK_SYNTH_STEP, {
        // If you are deploying code from a different branch
        // change `stageName` to the branch name
        input: CodePipelineSource.gitHub(CDK_GITHUB_REPO, stageName, {
          authentication: GITHUB_TOKEN,
        }),
        commands: ['npm run cdk-synth'],
        primaryOutputDirectory: CDK_SYNTH_OUTPUT_DIRECTORY,
      }),
    });

    const dockerBuild = new CodeBuildStep(`build${stageTitle}DockerImage`, {
      // Server is in a separate repo
      input: CodePipelineSource.gitHub(SERVER_GITHUB_REPO, 'main', {
        authentication: GITHUB_TOKEN,
      }),
      buildEnvironment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      // Docker build step is done using code from the server repo
      // so we have to pass in an array of commands rather than
      // using custom npm commands and/or scripts from this repo
      // NOTE: Change filepath in the `docker build ...` command if
      // the server Dockerfile is not in the root directory
      commands: dockerBuildCommands,
      env: {
        AWS_ACCOUNT_ID: this.account,
        IMAGE_REPO_NAME: props.ecr.repositoryName,
        AWS_DEFAULT_REGION: this.region,
        IMAGE_TAG: props.imageTag,
      },
    });

    const stage = new Stage(this, `${stageTitle}Deployment`);
    const stackName = `ServerStack-${stageTitle}`;

    if (props.deployServer) {
      if (!props.vpc || !props.rdsSecret || !props.rdsSecurityGroup) {
        throw new Error(
          'Server deployment requires VPC and/or RDS info to execute properly.'
        );
      }
      // Execute server deploymnent within the same CodePipeline
      new DeploymentStack(stage, stackName, {
        stageName: props.stageName,
        imageTag: props.imageTag,
        vpc: props.vpc,
        rdsSecret: props.rdsSecret,
        rdsSecurityGroup: props.rdsSecurityGroup,
        env: props.env,
      });
      pipeline.addStage(stage, {
        pre: [
          dockerBuild,
          // Include a manual approval step which requires a IAM
          // user to approve the deployment on AWS console UI
          new pipelines.ManualApprovalStep('ApproveProduction'),
        ],
      });
    } else {
      // We can also have the codepipeline stack operate on its own
      // and only responsible for building, tagging and publishing
      // docker images. That said, the pipeline needs a stack of
      // its own to work so it's technically a no-op
      new Stack(stage, `ServerStack-${stageTitle}`, { env: props.env });
      pipeline.addStage(stage, { pre: [dockerBuild] });
    }

    pipeline.buildPipeline();

    props.ecr.grantPullPush(dockerBuild.grantPrincipal);
  }
}
