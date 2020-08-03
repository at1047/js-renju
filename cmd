docker stop renju
docker rm renju
docker build -t at1047/renju .
docker run -d --name renju -p 8080:8080 at1047/renju
