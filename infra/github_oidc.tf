# Lets GitHub Actions assume an AWS role with short-lived credentials, so no
# long-lived AWS access keys are ever stored as GitHub secrets.
# AWS validates GitHub's certificate itself; the thumbprint is required by the
# API but not used for verification.
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "github_deploy" {
  name = "${local.name}-github-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          # only jobs running in this repo's "production" environment may deploy
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:environment:production"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_deploy" {
  name = "push-image-and-deploy"
  role = aws_iam_role.github_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      [
        {
          Sid      = "EcrLogin"
          Effect   = "Allow"
          Action   = ["ecr:GetAuthorizationToken"]
          Resource = "*" # this action does not support resource-level scoping
        },
        {
          Sid    = "EcrPush"
          Effect = "Allow"
          Action = [
            "ecr:BatchCheckLayerAvailability",
            "ecr:BatchGetImage",
            "ecr:CompleteLayerUpload",
            "ecr:InitiateLayerUpload",
            "ecr:PutImage",
            "ecr:UploadLayerPart",
          ]
          Resource = aws_ecr_repository.model_service.arn
        },
      ],
      var.create_service ? [
        {
          Sid      = "AppRunnerDeploy"
          Effect   = "Allow"
          Action   = ["apprunner:StartDeployment", "apprunner:DescribeService"]
          Resource = aws_apprunner_service.model_service[0].arn
        },
      ] : []
    )
  })
}
