pipeline {
    agent any

    environment {
        IMAGE_NAME      = "schoolkart-erp"
        CONTAINER_NAME  = "schoolkart-app"
        PORT_FRONTEND   = "1000"
        PORT_BACKEND    = "8083"

        DB_HOST         = "5.223.64.206"
        DB_PORT         = "5432"
        DB_NAME         = "schoolcrm"
        DB_USER         = "admin"
        DB_PASSWORD     = "ScaleLite2026XkP9mNqR"
        JWT_SECRET      = "schoolkart_jwt_secret_key_2024_prod"
        SERVER_IP           = "93.127.194.128"
        NEXT_PUBLIC_API_URL = "http://93.127.194.128:${PORT_BACKEND}"
        FRONTEND_URL        = "http://93.127.194.128:${PORT_FRONTEND}"
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/DeepakVijayasarathi/school.git'
            }
        }

        stage('Build Image') {
            steps {
                sh """
                    docker build \
                        --build-arg NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
                        -t ${IMAGE_NAME}:${BUILD_NUMBER} \
                        -t ${IMAGE_NAME}:latest \
                        .
                """
            }
        }

        stage('Stop Old Container') {
            steps {
                sh """
                    docker stop ${CONTAINER_NAME} || true
                    docker rm   ${CONTAINER_NAME} || true
                """
            }
        }

        stage('Deploy') {
            steps {
                sh """
                    docker volume create schoolkart-uploads || true

                    docker run -d \
                        --name ${CONTAINER_NAME} \
                        --restart unless-stopped \
                        -e ASPNETCORE_ENVIRONMENT=Production \
                        -e ConnectionStrings__DefaultConnection="Host=${DB_HOST};Port=${DB_PORT};Database=${DB_NAME};Username=${DB_USER};Password=${DB_PASSWORD}" \
                        -e Jwt__Secret="${JWT_SECRET}" \
                        -e Jwt__Issuer="schoolkart" \
                        -e Jwt__Audience="schoolkart-users" \
                        -e NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
                        -e FrontendUrl="${FRONTEND_URL}" \
                        -p ${PORT_FRONTEND}:3000 \
                        -p ${PORT_BACKEND}:8080 \
                        -v schoolkart-uploads:/app/uploads \
                        --health-cmd 'curl -sf http://localhost:8080/health || exit 1' \
                        --health-interval 30s \
                        --health-timeout 10s \
                        --health-retries 3 \
                        ${IMAGE_NAME}:${BUILD_NUMBER}
                """
            }
        }

        stage('Smoke Test') {
            steps {
                sh """
                    echo "Waiting for container to become healthy..."
                    for i in \$(seq 1 20); do
                        STATUS=\$(docker inspect --format='{{.State.Health.Status}}' ${CONTAINER_NAME} 2>/dev/null)
                        if [ "\$STATUS" = "healthy" ]; then
                            echo "Container is healthy after \$i attempts"
                            break
                        fi
                        echo "  attempt \$i: \$STATUS"
                        sleep 5
                    done

                    CONTAINER_IP=\$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${CONTAINER_NAME})
                    echo "Container IP: \$CONTAINER_IP"

                    curl -sf http://\$CONTAINER_IP:8080/health || \
                        (echo "Backend health check failed"; exit 1)

                    curl -sf http://\$CONTAINER_IP:3000/ || \
                        (echo "Frontend health check failed"; exit 1)

                    echo "Smoke tests passed"
                """
            }
        }

        stage('Prune Old Images') {
            steps {
                sh """
                    docker images ${IMAGE_NAME} --format '{{.Tag}}' | \
                        grep -v latest | grep -v ${BUILD_NUMBER} | \
                        xargs -r -I{} docker rmi ${IMAGE_NAME}:{} || true
                """
            }
        }
    }

    post {
        success {
            echo "Deployment successful — build #${BUILD_NUMBER}"
            echo "Frontend: http://${SERVER_IP}:${PORT_FRONTEND}"
            echo "Backend API: http://${SERVER_IP}:${PORT_BACKEND}/swagger"
        }
        failure {
            echo "Build #${BUILD_NUMBER} failed — rolling back to last known-good image"
            sh """
                docker stop ${CONTAINER_NAME} || true
                docker rm   ${CONTAINER_NAME} || true

                # Walk backwards to find a tag that actually exists as an image
                PREV=\$(( ${BUILD_NUMBER} - 1 ))
                ROLLBACK_IMAGE=""
                while [ "\$PREV" -gt 0 ]; do
                    if docker image inspect ${IMAGE_NAME}:\$PREV > /dev/null 2>&1; then
                        ROLLBACK_IMAGE="${IMAGE_NAME}:\$PREV"
                        break
                    fi
                    PREV=\$(( \$PREV - 1 ))
                done

                if [ -n "\$ROLLBACK_IMAGE" ]; then
                    echo "Rolling back to \$ROLLBACK_IMAGE"
                    docker run -d \
                        --name ${CONTAINER_NAME} \
                        --restart unless-stopped \
                        -e ASPNETCORE_ENVIRONMENT=Production \
                        -e ConnectionStrings__DefaultConnection="Host=${DB_HOST};Port=${DB_PORT};Database=${DB_NAME};Username=${DB_USER};Password=${DB_PASSWORD}" \
                        -e Jwt__Secret="${JWT_SECRET}" \
                        -e Jwt__Issuer="schoolkart" \
                        -e Jwt__Audience="schoolkart-users" \
                        -e NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
                        -e FrontendUrl="${FRONTEND_URL}" \
                        -p ${PORT_FRONTEND}:3000 \
                        -p ${PORT_BACKEND}:8080 \
                        -v schoolkart-uploads:/app/uploads \
                        \$ROLLBACK_IMAGE || echo "Rollback container failed to start"
                else
                    echo "No previous image found — app is offline until next successful build"
                fi
            """
        }
        always {
            sh "docker system prune -f --filter 'until=24h' || true"
        }
    }
}
