import 'source-map-support';
import routers from 'server/routers';
import express from 'express';
import config from 'server/config';
import loggers from 'server/loggers';
import rawBody from 'raw-body';

const port = config.port || 8080;
const app = express();

app.use(function (req, res, next) {
  req.clientIp = req.ip;

  if (config.xForwardedFor) {
    req.clientIp = req.headers['x-forwarded-for'] || req.ip;
  }

  res.message = (statusCode, message) => {
    res.status(statusCode).send(`${statusCode} - ${statusCode == 500 ? 'Internal server error' : message}\n`);
  };

  next();
});

app.use(function (err, req, res, next) {
  loggers.main.error({err: err});

  let statusCode = err.statusCode || 500,
      message = (statusCode == 500 ? null : err.message) || 'Internal server error';

  res.message(statusCode, message);
});

app.disable('x-powered-by');

app.use(function (req, res, next) {
  rawBody(req, {
    limit: '16mb'
  }, function (err, buff) {
    if (err) {
      loggers.main.error({err: err}, 'Failed to parse data');
      res.message(err.statusCode || 500, err.message);
      return;
    }
    req.data = buff;
    next();
  });
});

routers(app);

app.listen(port, (err) => err ? loggers.main.fatal(err) : loggers.main.info(`Listening on port ${port}`));
