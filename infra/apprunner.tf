# ---- shared HMAC secret --------------------------------------------------
# Generated here, stored encrypted in SSM, injected into the container as an
# env var at runtime. It never appears in the image or in GitHub.
resource "random_password" "model_service_secret" {
  length  = 64
  special = false
}

resource "aws_ssm_parameter" "model_service_secret" {
  name  = "/cpdojo/model-service/secret"
  type  = "SecureString"
  value = random_password.model_service_secret.result
}

# ---- role App Runner uses to pull images from ECR ------------------------
resource "aws_iam_role" "apprunner_ecr_access" {
  name = "${local.name}-ecr-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "build.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr_access" {
  role       = aws_iam_role.apprunner_ecr_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# ---- role the running container assumes ---------------------------------
# least privilege: it can read exactly one parameter and nothing else
resource "aws_iam_role" "apprunner_instance" {
  name = "${local.name}-instance"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "tasks.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "apprunner_instance_read_secret" {
  name = "read-model-service-secret"
  role = aws_iam_role.apprunner_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameters"]
      Resource = aws_ssm_parameter.model_service_secret.arn
    }]
  })
}

# ---- the service ---------------------------------------------------------
resource "aws_apprunner_auto_scaling_configuration_version" "model_service" {
  auto_scaling_configuration_name = local.name
  min_size                        = 1
  max_size                        = 2
  max_concurrency                 = 50
}

resource "aws_apprunner_service" "model_service" {
  count        = var.create_service ? 1 : 0
  service_name = local.name

  source_configuration {
    # deploys are triggered explicitly by the GitHub Actions workflow
    auto_deployments_enabled = false

    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    image_repository {
      image_identifier      = "${aws_ecr_repository.model_service.repository_url}:latest"
      image_repository_type = "ECR"

      image_configuration {
        port = "8080"
        runtime_environment_secrets = {
          MODEL_SERVICE_SECRET = aws_ssm_parameter.model_service_secret.arn
        }
      }
    }
  }

  instance_configuration {
    cpu               = "256" # 0.25 vCPU
    memory            = "512" # 0.5 GB
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 3
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.model_service.arn

  depends_on = [aws_iam_role_policy_attachment.apprunner_ecr_access]
}
