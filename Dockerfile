FROM node:6.12

COPY client /github-pub-sub/client
COPY docker/entrypoint.sh /github-pub-sub/entrypoint.sh

RUN ["chmod", "a+x", "/github-pub-sub/entrypoint.sh"]

RUN cd /github-pub-sub/client && npm install

ENTRYPOINT "/github-pub-sub/entrypoint.sh"
