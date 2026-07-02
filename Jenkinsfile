// =====================================================================
//  Pipeline CI/CD - TaskList BACKEND (Express + Prisma + TypeScript)
// ---------------------------------------------------------------------
//  Prérequis sur l'agent Jenkins :
//    - Node.js 22 (outil "NodeJS-22" configuré dans Jenkins, ou node/npm sur le PATH)
//    - Docker (démon accessible depuis l'agent)
//    - Un scanner SonarQube ("SonarScanner" dans les Global Tool Configuration)
//  Credentials Jenkins attendus (jamais en clair dans le code) :
//    - dockerhub-credentials : type "Username with password" (login Docker Hub)
//    - sonar-token           : type "Secret text" (token SonarQube)
//  Serveur SonarQube déclaré sous le nom "SonarQube" (Manage Jenkins > System).
// =====================================================================

pipeline {
    agent any

    tools {
        nodejs 'NodeJS-22'
    }

    environment {
        IMAGE_NAME = 'tasklist-backend'
        SONAR_SCANNER = tool 'SonarScanner'
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Prisma generate') {
            steps {
                // Génère le client Prisma nécessaire à la compilation TypeScript
                sh 'npx prisma generate'
            }
        }

        stage('Tests unitaires + couverture') {
            steps {
                sh 'npm run test:coverage'
            }
            post {
                always {
                    junit 'reports/junit.xml'
                }
            }
        }

        stage('Analyse SonarQube') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        sh '${SONAR_SCANNER}/bin/sonar-scanner -Dsonar.token=$SONAR_TOKEN'
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
                archiveArtifacts artifacts: 'dist/**', fingerprint: true
            }
        }

        stage('Build image Docker') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials',
                                                   usernameVariable: 'DOCKER_USER',
                                                   passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        docker build -t $DOCKER_USER/$IMAGE_NAME:$BUILD_NUMBER \
                                     -t $DOCKER_USER/$IMAGE_NAME:latest .
                    '''
                }
            }
        }

        stage('Scan sécurité (Trivy)') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials',
                                                   usernameVariable: 'DOCKER_USER',
                                                   passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        docker run --rm \
                          -v /var/run/docker.sock:/var/run/docker.sock \
                          -v $PWD:/work -w /work \
                          aquasec/trivy:latest image \
                          --severity HIGH,CRITICAL \
                          --exit-code 0 \
                          --no-progress \
                          $DOCKER_USER/$IMAGE_NAME:$BUILD_NUMBER
                    '''
                }
            }
        }

        stage('SBOM (SPDX)') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials',
                                                   usernameVariable: 'DOCKER_USER',
                                                   passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        docker run --rm \
                          -v /var/run/docker.sock:/var/run/docker.sock \
                          -v $PWD:/work -w /work \
                          aquasec/trivy:latest image \
                          --format spdx-json \
                          --output sbom-spdx.json \
                          $DOCKER_USER/$IMAGE_NAME:$BUILD_NUMBER
                    '''
                    archiveArtifacts artifacts: 'sbom-spdx.json', fingerprint: true
                }
            }
        }

        stage('Publication Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials',
                                                   usernameVariable: 'DOCKER_USER',
                                                   passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker push $DOCKER_USER/$IMAGE_NAME:$BUILD_NUMBER
                        docker push $DOCKER_USER/$IMAGE_NAME:latest
                        docker logout
                    '''
                }
            }
        }
    }

    post {
        always {
            sh 'docker image prune -f || true'
            cleanWs()
        }
        success {
            echo '✅ Pipeline backend terminé avec succès.'
        }
        failure {
            echo '❌ Échec du pipeline backend.'
        }
    }
}
