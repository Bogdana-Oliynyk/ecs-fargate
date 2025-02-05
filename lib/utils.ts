import { SecretValue } from 'aws-cdk-lib';

export const ECR_REPOSITORY_NAME = 'server-repository';

export const ECS_TASKS_URL = 'ecs-tasks.amazonaws.com';

export const SERVER_GITHUB_REPO = '<owner>/<server-repo>';

export const CDK_GITHUB_REPO = '<owner>/<cdk-repo>';

export const CDK_SYNTH_STEP = 'Synth';

export const CDK_SYNTH_OUTPUT_DIRECTORY = 'cdk.out';

export const GITHUB_TOKEN = SecretValue.secretsManager('gh-token');

export const dockerBuildCommands = [
  'echo "Logging in to Amazon ECR..."',
  'aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com',
  'echo "Building and tagging docker image..."',
  'docker build -t $IMAGE_REPO_NAME:$IMAGE_TAG .',
  'docker tag $IMAGE_REPO_NAME:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG',
  'echo "Pushing the Docker image..."',
  'docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG',
];

export const cdkSynthCommands = [
  'echo Installing initial dependencies',
  'npm install',
  'echo Installing all dependencies and building...',
  'npm run build-all',
  'echo Synthesizing the CDK Application...',
  'npx cdk synth',
];

export const stageTitleCase = (str: string) =>
  str.replace(
    /\w\S*/g,
    (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
