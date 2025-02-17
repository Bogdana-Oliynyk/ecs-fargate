#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {
  BastionStack,
  DeploymentStack,
  CodePipelineStack,
  ECRStack,
  RDSStack,
  VPCStack,
} from '../lib/';

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

// ----- END SHARED SERVICES -----

// ---------- STAGING ------------

// RDS DB
const stagingRdsStack = new RDSStack(app, 'RDSStack-Staging', {
  stageName: STAGING,
  vpc: vpcStack.vpc,
  bastionSecurityGroup: bastionStack.securityGroup,
  env: ENV,
});

// Here we demonstrate docker image and server deployment
// done in separate stacks. One use-case would be if we
// are working on network and/or optimizing ECS/Fargate
// without the need to publish docker image every time
// This way we reduce unnecessary CodeBuild/CodePipeline usage
new CodePipelineStack(app, 'CodePipelineStack-Staging', {
  stageName: STAGING,
  imageTag: STAGING,
  ecr: ecrStack.ecr,
  deployServer: false,
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

// ---------- PRODUCTION ------------

// RDS DB
const prodRdsStack = new RDSStack(app, 'RDSStack-Prod', {
  stageName: PRODUCTION,
  vpc: vpcStack.vpc,
  bastionSecurityGroup: bastionStack.securityGroup,
  env: ENV,
});

// Publish Docker image + server deployment
new CodePipelineStack(app, 'CodePipelineStack-Prod', {
  stageName: PRODUCTION,
  imageTag: PRODUCTION,
  ecr: ecrStack.ecr,
  deployServer: true,
  vpc: vpcStack.vpc,
  rdsSecret: prodRdsStack.rdsSecret,
  rdsSecurityGroup: prodRdsStack.securityGroup,
  env: ENV,
});

// --------- END PRODUCTION -----------
