import { Stack, StackProps } from 'aws-cdk-lib';
import {
  BastionHostLinux,
  ISecurityGroup,
  SecurityGroup,
  SubnetType,
} from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { getVpc } from './utils';

/*
We will use AWS Session manager (SSM) to access bastion.
See `bastion.sh` or more information
*/
export class BastionStack extends Stack {
  securityGroup: ISecurityGroup;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    const vpc = getVpc(this);

    const bastionSecurityGroup = new SecurityGroup(
      this,
      'BastionSecurityGroup',
      { vpc, allowAllOutbound: true }
    );
    this.securityGroup = bastionSecurityGroup;

    // Default Instance type is t3.nano, and the default
    // machine image should work for demonstration purposes
    // if there is a large demand in bastion access we may
    // need to adjust things accordingly
    new BastionHostLinux(this, 'BastionHost', {
      vpc,
      instanceName: 'bastion-host',
      subnetSelection: { subnetType: SubnetType.PUBLIC },
      securityGroup: bastionSecurityGroup,
    });
  }
}
