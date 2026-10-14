output "ecr_repository_name" {
  value = aws_ecr_repository.model_service.name
}

output "ecr_repository_url" {
  value = aws_ecr_repository.model_service.repository_url
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}

output "app_runner_service_arn" {
  value = var.create_service ? aws_apprunner_service.model_service[0].arn : null
}

output "app_runner_service_url" {
  description = "Hostname of the service; MODEL_SERVICE_URL is https://<this>"
  value       = var.create_service ? aws_apprunner_service.model_service[0].service_url : null
}

output "model_service_secret_ssm_name" {
  description = "Read with: aws ssm get-parameter --with-decryption --name <this> --query Parameter.Value --output text"
  value       = aws_ssm_parameter.model_service_secret.name
}
