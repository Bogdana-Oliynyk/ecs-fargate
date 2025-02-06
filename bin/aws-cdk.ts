#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DeploymentStack } from '../lib/deployment-stack';
import { DockerImageStack } from '../lib/docker-image-stack';
import { ECRStack } from '../lib/ecr-stack';
import { RDSStack } from '../lib/rds-stack';
import { VPCStack } from '../lib/vpc-stack';
import { BastionStack } from '../lib/bastion-stack';

const app = new cdk.App();
const ENV = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};
const STAGING = 'staging';
const PRODUCTION = 'production';

// ------ SHARED SERVICES -------

// ECR repo
const ecrStack = new ECRStack(app, 'ECRStack', { env: ENV });

// VPC
const vpcStack = new VPCStack(app, 'VPCStack', { env: ENV });

// Bastion for DB access
const bastionStack = new BastionStack(app, 'BastionStack', {
  vpc: vpcStack.vpc,
  env: ENV,
});

// --------- STAGING ------------

// RDS DB
const stagingRdsStack = new RDSStack(app, 'RDSStack-Staging', {
  stageName: STAGING,
  vpc: vpcStack.vpc,
  bastionSecurityGroup: bastionStack.securityGroup,
  env: ENV,
});

// Docker image
new DockerImageStack(app, 'DockerImageStack-Staging', {
  stageName: STAGING,
  imageTag: STAGING,
  ecr: ecrStack.ecr,
  env: ENV,
});

// Server deployment
new DeploymentStack(app, 'DeploymentStack-Staging', {
  stageName: STAGING,
  imageTag: STAGING,
  vpc: vpcStack.vpc,
  rdsSecret: stagingRdsStack.rdsSecret,
  rdsSecurityGroup: stagingRdsStack.securityGroup,
  env: ENV,
});

// --------- END STAGING ------------

// --------- PRODUCTION ------------

// RDS DB
const prodRdsStack = new RDSStack(app, 'RDSStack-Prod', {
  stageName: PRODUCTION,
  vpc: vpcStack.vpc,
  bastionSecurityGroup: bastionStack.securityGroup,
  env: ENV,
});

// Docker image
new DockerImageStack(app, 'DockerImageStack-Prod', {
  stageName: PRODUCTION,
  imageTag: PRODUCTION,
  ecr: ecrStack.ecr,
  env: ENV,
});

// Server deployment
new DeploymentStack(app, 'DeploymentStack-Prod', {
  stageName: PRODUCTION,
  imageTag: PRODUCTION,
  vpc: vpcStack.vpc,
  rdsSecret: prodRdsStack.rdsSecret,
  rdsSecurityGroup: prodRdsStack.securityGroup,
  env: ENV,
});

// --------- END PRODUCTION ------------
