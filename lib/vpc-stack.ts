import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import {
  FlowLogDestination,
  IpAddresses,
  IVpc,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { RDS_SUBNET_NAME, SERVER_SUBNET_NAME } from './utils';

export class VPCStack extends Stack {
  vpc: IVpc;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'server-vpc', {
      ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        // Public subnet allows access to resource to/from the internet
        // If you need to restrict access to certain resources (e.g.
        // some server endpoints) considering implementing authentication
        { name: SERVER_SUBNET_NAME, subnetType: SubnetType.PUBLIC },

        // Private isolated subnet does not have access to the internet
        // so it's best if your resource requires secure access
        // though that means you will need to figure in/egress yourself
        { name: RDS_SUBNET_NAME, subnetType: SubnetType.PRIVATE_ISOLATED },
      ],
    });

    // In a production scenario you would want to
    // retain the VPC upon stack deletion
    vpc.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const vpcLogGroup = new LogGroup(this, 'server-vpc-logs', {
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const vpcLogRole = new Role(this, 'server-vpc-log-role', {
      assumedBy: new ServicePrincipal('vpc-flow-logs.amazonaws.com'),
    });

    // Add Flow log piping to S3 for visibility
    vpc.addFlowLog('server-s3-flowlog', {
      destination: FlowLogDestination.toCloudWatchLogs(vpcLogGroup, vpcLogRole),
    });

    this.vpc = vpc;
  }
}
