import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { IRepository, Repository } from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import { ECR_REPOSITORY_NAME } from './utils';

export class ECRStack extends Stack {
  ecr: IRepository;

  // Stack to create the ECR repository
  // Since we are hard-coding the ECR repo name, if there is an existing
  // one you must manually remove the repo before deploying the stack
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.ecr = new Repository(this, 'ECRRepository', {
      repositoryName: ECR_REPOSITORY_NAME,
      imageScanOnPush: true,
      // In a production scenario you may want to
      // retain the ECR upon stack deletion
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
