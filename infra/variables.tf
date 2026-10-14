variable "aws_region" {
  description = "Region for all resources. ap-south-1 (Mumbai) keeps latency low for Indian users."
  type        = string
  default     = "ap-south-1"
}

variable "github_repository" {
  description = "owner/name of the GitHub repo allowed to deploy via OIDC."
  type        = string
  default     = "Darth-hub/cp-dojo"
}

variable "create_service" {
  description = "App Runner needs an image in ECR before the service can exist. Apply once with false, push the first image, then apply with true."
  type        = bool
  default     = false
}

variable "budget_alert_email" {
  description = "Email that receives cost alerts."
  type        = string
}

variable "monthly_budget_usd" {
  description = "Monthly spend that triggers alerts at 80% (forecast) and 100% (actual)."
  type        = number
  default     = 5
}
