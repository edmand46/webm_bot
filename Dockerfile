FROM jrottenberg/ffmpeg:4.1-ubuntu

USER root

RUN apt-get update
RUN apt-get -y install curl gnupg
RUN curl -sL https://deb.nodesource.com/setup_14.x  | bash -
RUN apt-get -y install nodejs
RUN node -v
RUN npm -v
RUN apt-get clean autoclean
RUN apt-get autoremove --yes
RUN rm -rf /var/lib/{apt,dpkg,cache,log}/

ENV NODE_WORKDIR /home/node/app

WORKDIR $NODE_WORKDIR
ADD . $NODE_WORKDIR
RUN mkdir -p $NODE_WORKDIR/tmp

RUN npm install

ENTRYPOINT [ "npm", "start" ]