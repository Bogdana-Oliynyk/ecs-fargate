import { CfnOutput, Fn, Stack, StackProps } from 'aws-cdk-lib';
import {
  ISecurityGroup,
  IVpc,
  Port,
  SecurityGroup,
  SubnetType,
} from 'aws-cdk-lib/aws-ec2';
import {
  Cluster,
  ContainerImage,
  FargateTaskDefinition,
  LogDriver,
  Secret as ecsSecret,
} from 'aws-cdk-lib/aws-ecs';
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ECR_REPOSITORY_NAME, ECS_TASKS_URL, stageTitleCase } from './utils';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Repository } from 'aws-cdk-lib/aws-ecr';
// import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';

interface DeploymentStackProps extends StackProps {
  stageName: string;
  imageTag: string;
  vpc: IVpc;
  rdsSecret: ISecret;
  rdsSecurityGroup: ISecurityGroup;
}

export class DeploymentStack extends Stack {
  constructor(scope: Construct, id: string, props: DeploymentStackProps) {
    super(scope, id, props);
    const stageName = props.stageName as string;
    const stageTitle = stageTitleCase(stageName);
    const dbSecret = Secret.fromSecretCompleteArn(
      this,
      'dbSecret',
      props?.rdsSecret.secretArn
    );

    const secretsManagerPermissions = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [dbSecret.secretArn],
    });

    const ecsCluster = new Cluster(this, `ECS${stageTitle}-Cluster`, {
      vpc: props?.vpc,
    });

    const executionRolePolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      // TODO: ECR permission should be more restrictive
      actions: ['ecr:*', 'logs:CreateLogStream', 'logs:PutLogEvents'],
    });
    executionRolePolicy.addAllResources();

    const executionRole = new Role(this, `${stageTitle}ExecutionRole`, {
      assumedBy: new ServicePrincipal(ECS_TASKS_URL),
    });
    executionRole.addToPolicy(executionRolePolicy);

    const taskRole = new Role(this, `${stageTitle}TaskRole`, {
      assumedBy: new ServicePrincipal(ECS_TASKS_URL),
    });

    const taskDefinition = new FargateTaskDefinition(
      this,
      `TaskDef-${stageName}`,
      {
        memoryLimitMiB: 512,
        cpu: 256,
        executionRole: executionRole,
        taskRole: taskRole,
      }
    );

    taskDefinition.addToTaskRolePolicy(secretsManagerPermissions);

    const repository = Repository.fromRepositoryName(
      this,
      'ECR',
      ECR_REPOSITORY_NAME
    );
    const container = taskDefinition.addContainer(`${stageTitle}Container`, {
      image: ContainerImage.fromEcrRepository(repository, props.imageTag),
      environment: {
        FORCE_DEPLOYMENT_ENV_VAR: Date.now().toString(), // Add a changing env variable to force a new deployment
      },
      secrets: {
        HOST: ecsSecret.fromSecretsManager(dbSecret, 'host'),
        DBNAME: ecsSecret.fromSecretsManager(dbSecret, 'dbname'),
        DBUSER: ecsSecret.fromSecretsManager(dbSecret, 'username'),
        DBPASS: ecsSecret.fromSecretsManager(dbSecret, 'password'),
        PORT: ecsSecret.fromSecretsManager(dbSecret, 'port'),
      },
      logging: LogDriver.awsLogs({
        streamPrefix: `${stageTitle}Logs`,
        logRetention: RetentionDays.TWO_WEEKS,
      }),
    });

    container.addPortMappings({ containerPort: 3000 });

    const fargateSecurityGroup = new SecurityGroup(
      this,
      `${stageTitle}FargateSecurityGroup`,
      { vpc: props?.vpc, allowAllOutbound: true }
    );

    // const certificate = Certificate.fromCertificateArn(
    //   this,
    //   'DomainCertificate',
    //   'arn:aws:acm:us-east-1:880890061696:certificate/ec9f3478-c72d-499f-aa25-d1fcdb45ab46',
    // );

    // Any changes/stack destroy + deploy will require changes to Route 53's
    // A type record for URLs that are using the ALB DNS name
    const fargateService = new ApplicationLoadBalancedFargateService(
      this,
      `${stageTitle}Service`,
      {
        cluster: ecsCluster,
        taskDefinition: taskDefinition,
        publicLoadBalancer: true,
        assignPublicIp: true,
        // certificate,
        // protocol: ApplicationProtocol.HTTPS,
        // listenerPort: 443,
        protocol: ApplicationProtocol.HTTP,
        listenerPort: 80,
        securityGroups: [fargateSecurityGroup],
        taskSubnets: { subnetType: SubnetType.PUBLIC },
        // redirectHTTP: true,
      }
    );

    const rdsSecurityGroup = SecurityGroup.fromSecurityGroupId(
      this,
      `RDS${stageTitle}SecurityGroup`,
      props?.rdsSecurityGroup.securityGroupId
    );

    rdsSecurityGroup.connections.allowFrom(
      fargateSecurityGroup,
      Port.tcp(5432),
      'Allow traffic from fargate/ECS'
    );
    fargateSecurityGroup.connections.allowFrom(
      rdsSecurityGroup,
      Port.tcp(5432),
      'Allow traffic from RDS'
    );

    // Output the ALB DNS name
    new CfnOutput(this, `LoadBalancer${stageTitle}DNS`, {
      value: fargateService.loadBalancer.loadBalancerDnsName,
    });
  }
}
