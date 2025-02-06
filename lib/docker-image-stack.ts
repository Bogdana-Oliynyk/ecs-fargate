import { Stack, StackProps, Stage } from 'aws-cdk-lib';
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

interface DockerImageStackProps extends StackProps {
  stageName: string;
  imageTag: string;
  ecr: IRepository;
}

export class DockerImageStack extends Stack {
  constructor(scope: Construct, id: string, props?: DockerImageStackProps) {
    super(scope, id, props);
    const stageName = props?.stageName as string;
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
      commands: dockerBuildCommands,
      env: {
        AWS_ACCOUNT_ID: this.account,
        IMAGE_REPO_NAME: props?.ecr.repositoryName as string,
        AWS_DEFAULT_REGION: this.region,
        IMAGE_TAG: props?.imageTag as string,
      },
    });

    const stage = new Stage(this, `${stageTitle}Deployment`);
    // The codepipeline needs a stack of its own to work
    // but it's technically a no-op
    new Stack(stage, `ServerStack-${stageTitle}`, { env: props?.env });

    pipeline.addStage(stage, { pre: [dockerBuild] });

    pipeline.buildPipeline();

    props?.ecr.grantPullPush(dockerBuild.grantPrincipal);
  }
}
