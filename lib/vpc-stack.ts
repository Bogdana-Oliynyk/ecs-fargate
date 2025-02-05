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

export class VPCStack extends Stack {
  vpc: IVpc;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'server-vpc', {
      ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { name: 'server', subnetType: SubnetType.PUBLIC },
        { name: 'rds', subnetType: SubnetType.PRIVATE_ISOLATED },
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
