import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ECRStack } from '../lib/ecr-stack';

// Test assertion overview:
// https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions-readme.html
describe('CDK tests', () => {
  const testEnv = {
    account: 'some-account',
    region: 'some-region',
  };

  // how to print out the template to help with writing the tests
  // console.log(JSON.stringify(template.toJSON(), null, 2));

  test('ECR template has correct resources', () => {
    const app = new App();
    const stack = new ECRStack(app, 'TestECRStack', { env: testEnv });

    // Template is a suite of assertions that can be run on a CDK stack
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions.Template.html
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::ECR::Repository', {
      ImageScanningConfiguration: { ScanOnPush: true },
      RepositoryName: 'server-repository',
    });
    template.hasResource('AWS::ECR::Repository', {
      UpdateReplacePolicy: 'Delete',
      DeletionPolicy: 'Delete',
    });
  });
});
