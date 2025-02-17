import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ECRStack } from '../lib/ecr-stack';
import { VPCStack } from '../lib/vpc-stack';
import { RDS_SUBNET_NAME, SERVER_SUBNET_NAME } from '../lib/utils';
import { BastionStack } from '../lib/bastion-stack';
import { RDSStack } from '../lib';

// Test assertion overview:
// https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions-readme.html
describe('CDK tests', () => {
  const testEnv = {
    account: 'some-account',
    region: 'some-region',
  };

  const getPropertyValues = (template: Template, resourceType: string) => {
    template.resourceCountIs(resourceType, 1);
    return Object.values(template.findResources(resourceType))[0].Properties;
  };

  const hasSecurityGroup = (template: Template) => {
    const securityGroupProperties = getPropertyValues(
      template,
      'AWS::EC2::SecurityGroup'
    );
    expect(Object.keys(securityGroupProperties)).toContain(
      'SecurityGroupEgress'
    );
  };

  // how to print out the template to help with writing the tests
  // console.log(JSON.stringify(template.toJSON(), null, 2));

  it('ECR template has correct resources', () => {
    const app = new App();
    const stack = new ECRStack(app, 'TestECRStack', { env: testEnv });

    // Template is a suite of assertions that can be run on a CDK stack
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions.Template.html
    const template = Template.fromStack(stack);
    const resourceType = 'AWS::ECR::Repository';
    template.resourceCountIs(resourceType, 1);
    template.hasResourceProperties(resourceType, {
      ImageScanningConfiguration: { ScanOnPush: true },
      RepositoryName: 'server-repository',
    });
    template.hasResource(resourceType, {
      UpdateReplacePolicy: 'Delete',
      DeletionPolicy: 'Delete',
    });
  });

  it('VPC template has correct resources', () => {
    const vpcStackId = 'TestVPCStack';
    const app = new App();
    const stack = new VPCStack(app, vpcStackId, { env: testEnv });
    const template = Template.fromStack(stack);

    // Assert VPC has expected properties
    const vpcResourceType = 'AWS::EC2::VPC';
    template.resourceCountIs(vpcResourceType, 1);
    template.hasResourceProperties(vpcResourceType, {
      CidrBlock: '10.0.0.0/16',
      EnableDnsHostnames: true,
      EnableDnsSupport: true,
      Tags: [
        {
          Key: 'Name',
          Value: `${vpcStackId}/server-vpc`,
        },
      ],
    });
    template.hasResource(vpcResourceType, {
      UpdateReplacePolicy: 'Delete',
      DeletionPolicy: 'Delete',
    });

    // Assert subnets have expect properties
    const subnetResourceType = 'AWS::EC2::Subnet';
    template.resourceCountIs(subnetResourceType, 4);
    const subnets = Object.values(template.findResources('AWS::EC2::Subnet'));
    const expectedSubnetNames = [SERVER_SUBNET_NAME, RDS_SUBNET_NAME];
    // Subnet name and type comes in the form of tags
    // AWS templates do not have native methods to assert tags out of the box
    for (const subnetProps of subnets) {
      const tags = subnetProps.Properties.Tags;
      let subnetName;
      for (const [key, value] of Object.entries(tags)) {
        if (key === 'aws-cdk:subnet-name') {
          expect(expectedSubnetNames).toContain(value);
          subnetName = value;
        } else if (key === 'aws-cdk:subnet-type') {
          if (subnetName === SERVER_SUBNET_NAME) {
            expect(value).toBe('Public');
          } else if (subnetName === RDS_SUBNET_NAME) {
            expect(value).toBe('Isolated');
          } else {
            throw new Error(`Unknown subnet ${subnetName} with type ${value}`);
          }
        }
      }
    }

    template.resourceCountIs('AWS::EC2::NatGateway', 1);
    template.resourceCountIs('AWS::EC2::InternetGateway', 1);

    // Assert the correct permission for VPC logging
    const iamPolicies = template.findResources('AWS::IAM::Policy');
    const policyMapping = Object.values(iamPolicies);
    expect(policyMapping.length).toBe(1);
    const iamPolicy = policyMapping[0];
    const statements = iamPolicy.Properties.PolicyDocument.Statement;
    expect(statements.length).toBeGreaterThan(0);
    const actions = statements[0].Action;
    expect(actions).toEqual([
      'logs:CreateLogStream',
      'logs:PutLogEvents',
      'logs:DescribeLogStreams',
    ]);
  });

  it('Bastion Stack has correct resources', () => {
    const app = new App();
    const vpc = new VPCStack(app, 'testVPCStack', { env: testEnv });
    const stack = new BastionStack(app, 'testBastionStack', {
      vpc: vpc.vpc,
      env: testEnv,
    });
    const template = Template.fromStack(stack);
    hasSecurityGroup(template);
    template.hasResourceProperties('AWS::EC2::Instance', {
      InstanceType: 't3.nano',
    });
  });

  it('RDS Stack has correct resources', () => {
    const app = new App();
    const vpc = new VPCStack(app, 'testVPCStack', { env: testEnv });
    const bastion = new BastionStack(app, 'testBastionStack', {
      vpc: vpc.vpc,
      env: testEnv,
    });
    const stack = new RDSStack(app, 'testRDSStack', {
      stageName: 'test',
      vpc: vpc.vpc,
      bastionSecurityGroup: bastion.securityGroup,
      env: testEnv,
    });
    const template = Template.fromStack(stack);
    hasSecurityGroup(template);
    const securityGroupIngressProperties = getPropertyValues(
      template,
      'AWS::EC2::SecurityGroupIngress'
    );
    expect(securityGroupIngressProperties.FromPort).toEqual(5432);
    expect(securityGroupIngressProperties.ToPort).toEqual(5432);
    const instanceProperties = getPropertyValues(
      template,
      'AWS::RDS::DBInstance'
    );
    expect(instanceProperties.DBInstanceClass).toEqual('db.t3.micro');
    expect(instanceProperties.DBName).toEqual('DBTest');
    expect(instanceProperties.Engine).toEqual('postgres');
    expect(instanceProperties.EngineVersion).toEqual('16.4');
    expect(instanceProperties.publiclyAccessible).toBeFalsy();
    expect(instanceProperties.StorageType).toEqual('gp2');
  });
});
