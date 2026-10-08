docker run --rm -i \
    -e ECS_CLUSTER=ECS_CLUSTER\
    -e ECS_TASK_ARN=ECS_TASK_ARN\
    -e ECS_TASK_DEFINITION=ECS_TASK_DEFINITION\
    -e STACK=test-stack\
    -e STAGE=DEV\
    -e APP=test-app\
    -e GU_REPO=GU_REPO\
    -e TASK_NAME=TASK_NAME\
    -e OUTPUT_PLUGIN=stdout\
    -p 24224:24224 \
    $(docker build -q .. )
