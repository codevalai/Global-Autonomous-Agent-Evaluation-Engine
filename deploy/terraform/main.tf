terraform {
  required_version = ">= 1.8.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.32"
    }
  }
}

variable "cluster_name" {
  type    = string
  default = "gaee-global-top1m-mesh"
}

variable "regions" {
  type    = list(string)
  default = ["us-east-1", "eu-central-1", "ap-northeast-1"]
}

output "gaee_architecture_topology" {
  value = {
    cluster_name           = var.cluster_name
    active_active_regions  = var.regions
    crawler_cadence_sec    = 5
    redis_zset_leaderboard = "global:directory:top_1m (Cap: 1,000,000)"
    qdrant_vector_dim      = 1536
    sandbox_isolation      = "Firecracker MicroVM + eBPF Syscall Filter"
  }
}
