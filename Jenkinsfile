// =====================================================================
//  Pipeline CI/CD - TaskList BACKEND (Express + Prisma + TypeScript)
//  Cible : infrastructure Jenkins de l'école (agents avec Node, Docker
//  et Trivy préinstallés ; serveur SonarQube "sonarqube-server-1").
// ---------------------------------------------------------------------
//  Credential Jenkins requis (jamais en clair dans le code) :
//    - dockerhub-credentials : "Username with password" (login Docker Hub)
//  Le token SonarQube est injecté automatiquement par withSonarQubeEnv.
// =====================================================================

pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        // Namespace Docker Hub = tommyk78 ; convention <user>/tasklist-backend-exam
        IMAGE_NAME = 'tommyk78/tasklist-backend-exam'
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out repository...'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing dependencies...'
                sh 'npm ci --include=dev'
            }
        }

        stage('Generate Prisma Client') {
            steps {
                echo 'Generating Prisma client...'
                sh 'npx prisma generate'
            }
        }

        stage('Build') {
            steps {
                echo 'Building TypeScript project...'
                sh 'npm run build'
            }
        }

        stage('Unit Tests') {
            steps {
                echo 'Running unit tests with coverage...'
                sh 'npm run test:coverage'
            }
            post {
                always {
                    // Publication du rapport JUnit dans Jenkins
                    junit 'reports/junit.xml'
                }
            }
        }

        stage('E2E Tests') {
            steps {
                echo 'Running E2E tests...'
                sh 'npm run test:e2e'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                echo 'Running SonarQube analysis...'
                // Le scanner lit sonar-project.properties ; host + token injectés par withSonarQubeEnv
                withSonarQubeEnv('sonarqube-server-1') {
                    sh 'npx sonarqube-scanner'
                }
            }
        }

        stage('SonarQube Quality Gate') {
            steps {
                echo 'Checking SonarQube Quality Gate...'
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'
                sh 'docker build -t $IMAGE_NAME:$BUILD_NUMBER -t $IMAGE_NAME:latest -f Dockerfile .'
            }
        }

        stage('Scan with Trivy') {
            steps {
                echo 'Scanning Docker image with Trivy...'
                // Rapport JSON des vulnérabilités HIGH/CRITICAL
                sh 'trivy image --format json --output trivy-report.json --severity HIGH,CRITICAL $IMAGE_NAME:$BUILD_NUMBER'
                // Génération du SBOM au format SPDX
                sh 'trivy image --format spdx-json --output sbom-spdx.json $IMAGE_NAME:$BUILD_NUMBER'
                // Résumé lisible dans la console
                sh 'trivy image --format table --severity HIGH,CRITICAL $IMAGE_NAME:$BUILD_NUMBER'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json, sbom-spdx.json', fingerprint: true, allowEmptyArchive: true
                }
            }
        }

        stage('Publish to Docker Hub') {
            steps {
                echo 'Publishing image to Docker Hub...'
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials',
                                                   usernameVariable: 'DOCKER_USER',
                                                   passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker push $IMAGE_NAME:$BUILD_NUMBER
                        docker push $IMAGE_NAME:latest
                        docker logout
                    '''
                }
            }
        }
    }

    post {
        always {
            echo 'Cleaning up workspace...'
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed.'
        }
    }
}
