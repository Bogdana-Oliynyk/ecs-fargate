import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import {
  BastionHostLinux,
  ISecurityGroup,
  IVpc,
  SecurityGroup,
  SubnetType,
} from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface BastionStackProps extends StackProps {
  vpc: IVpc;
}
/*
We will use AWS Session manager (SSM) to access bastion.
1. Install Session Manager Plugin if you have not done so
2. In terminal, run:
$ export AWS_REGION=<your region>

# Add --profile <profile-name> if needed
$ export BASTION_INSTANCE_ID=$(aws ec2 describe-instances \
                          --region=$AWS_REGION \
                          --filter "Name=tag:Name,Values=bastion-host" \
                          --query "Reservations[].Instances[?State.Name == 'running'].InstanceId[]" \
                          --output text)
$ aws ssm start-session --target $BASTION_INSTANCE_ID --region=$AWS_REGION

Ref: https://dev.to/aws-builders/create-a-bastion-with-aws-cdk-1ik8
*/
export class BastionStack extends Stack {
  securityGroup: ISecurityGroup;

  constructor(scope: Construct, id: string, props: BastionStackProps) {
    super(scope, id, props);

    const bastionSecurityGroup = new SecurityGroup(
      this,
      'BastionSecurityGroup',
      { vpc: props?.vpc, allowAllOutbound: true }
    );
    this.securityGroup = bastionSecurityGroup;

    // Default Instance type is t3.nano, and the default
    // machine image should work for demonstration purposes
    // if there is a large demand in bastion access we may
    // need to adjust things accordingly
    new BastionHostLinux(this, 'BastionHost', {
      vpc: props?.vpc,
      instanceName: 'bastion-host',
      subnetSelection: { subnetType: SubnetType.PUBLIC },
      securityGroup: bastionSecurityGroup,
    });
  }
}
