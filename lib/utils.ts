import { SecretValue } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

// General AWS CDK related items
export const ECS_TASKS_URL = 'ecs-tasks.amazonaws.com';
export const ECR_REPOSITORY_NAME = 'server-repository';
export const SERVER_SUBNET_NAME = 'server';
export const RDS_SUBNET_NAME = 'rds';
export const CDK_SYNTH_STEP = 'Synth';
export const CDK_SYNTH_OUTPUT_DIRECTORY = 'cdk.out';

// CodePipeline related items
export const SERVER_GITHUB_REPO = '<owner>/<server-repo>';
export const CDK_GITHUB_REPO = '<owner>/<cdk-repo>';

// SSM Parameter store and Secrets Manager related items
export const VPC_ID_SSM_NAME = `/${SERVER_SUBNET_NAME}/vpc-id`;
export const RDS_SECURITY_GROUP_ID_SSM_NAME = `/${RDS_SUBNET_NAME}/rds-security-group-id`;
export const RDS_SECRET_NAME_SSM_NAME = `/${RDS_SUBNET_NAME}/rds-secret-name`;
export const GITHUB_TOKEN = SecretValue.secretsManager('gh-token');

// Change filepath in the `docker build ...` command if the server Dockerfile is not in the root directory
export const dockerBuildCommands = [
  'echo "Logging in to Amazon ECR..."',
  'aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com',
  'echo "Building and tagging docker image..."',
  'docker build -t $IMAGE_REPO_NAME:$IMAGE_TAG .',
  'docker tag $IMAGE_REPO_NAME:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG',
  'echo "Pushing the Docker image..."',
  'docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG',
];

export const stageTitleCase = (str: string) =>
  str.replace(
    /\w\S*/g,
    (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );

export const getVpc = (scope: Construct) => {
  const vpcId = StringParameter.valueFromLookup(scope, VPC_ID_SSM_NAME);
  return Vpc.fromLookup(scope, 'vpc', { vpcId });
};
