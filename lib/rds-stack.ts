import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  ISecurityGroup,
  Port,
  SecurityGroup,
  SubnetType,
} from 'aws-cdk-lib/aws-ec2';
import {
  DatabaseInstance,
  DatabaseInstanceEngine,
  DatabaseInstanceProps,
  PostgresEngineVersion,
  StorageType,
} from 'aws-cdk-lib/aws-rds';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  getVpc,
  RDS_SECRET_NAME_SSM_NAME,
  RDS_SECURITY_GROUP_ID_SSM_NAME,
  stageTitleCase,
} from './utils';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

interface RDSStackProps extends StackProps {
  stageName: string;
  bastionSecurityGroup: ISecurityGroup;
}

export class RDSStack extends Stack {
  constructor(scope: Construct, id: string, props: RDSStackProps) {
    super(scope, id, props);
    const stageName = props?.stageName as string;
    const stageTitle = stageTitleCase(stageName);
    const isProduction = stageName === 'production';
    const vpc = getVpc(this);

    const rdsSecurityGroup = new SecurityGroup(
      this,
      `RDS${stageTitle}SecurityGroup`,
      { vpc, allowAllOutbound: true }
    );

    let dbBaseProps: DatabaseInstanceProps = {
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_16_4,
      }),
      instanceType: InstanceType.of(
        InstanceClass.BURSTABLE3,
        InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
      allocatedStorage: 20,
      cloudwatchLogsRetention: RetentionDays.TWO_WEEKS,
      databaseName: `DB${stageTitle}`,
      multiAz: isProduction,
      // With a `RETAIN` removal policy we will need to
      // manually delete the RDS first before the stack can be destroyed
      removalPolicy: isProduction
        ? RemovalPolicy.RETAIN
        : RemovalPolicy.DESTROY,
      securityGroups: [rdsSecurityGroup],
      storageType: StorageType.GP2,
    };

    if (isProduction) {
      // Only enable autoscaling in production
      dbBaseProps = { ...dbBaseProps, maxAllocatedStorage: 100 };
    }

    const rds = new DatabaseInstance(
      this,
      `RDS${stageTitle}Instance`,
      dbBaseProps
    );

    const dbPort = 5432;
    const bastionSecurityGroup = SecurityGroup.fromSecurityGroupId(
      this,
      'BastionSecurityGroup',
      props?.bastionSecurityGroup.securityGroupId
    );
    rdsSecurityGroup.connections.allowFrom(
      bastionSecurityGroup.connections,
      Port.tcp(dbPort),
      'Allow access from Bastion'
    );

    // Allow other stacks to reference RDS-related items via SSM parameter
    new StringParameter(this, 'RdsSecurityGroupId', {
      parameterName: RDS_SECURITY_GROUP_ID_SSM_NAME,
      stringValue: rdsSecurityGroup.securityGroupId,
    });

    const secret = rds.secret;
    if (!secret) {
      throw new Error('Missing DB Secret');
    }
    new StringParameter(this, 'RdsSecretArn', {
      parameterName: RDS_SECRET_NAME_SSM_NAME,
      stringValue: secret.secretName,
    });
  }
}
