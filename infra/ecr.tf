resource "aws_ecr_repository" "model_service" {
  name                 = local.name
  image_tag_mutability = "MUTABLE" # :latest is moved on every deploy; commit-SHA tags never change

  image_scanning_configuration {
    scan_on_push = true # basic CVE scan of every pushed image
  }
}

# keep storage (and cost) bounded: only the 10 most recent images survive
resource "aws_ecr_lifecycle_policy" "model_service" {
  repository = aws_ecr_repository.model_service.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
