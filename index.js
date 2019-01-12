const axios = require('axios');
const Koa = require('koa');
var Router = require('koa-router');
var bodyParser = require('koa-bodyparser');
const fs = require('fs');
const URL = require('url').URL;

const { PORT } = require('./config');

const app = new Koa();
const router = new Router();

function readFile(path, encoding) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, encoding, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      resolve(data.toString());
    });
  });
}

const githubRepo = {
  user: '',
  repo: '',
  branch: ''
};

// 转换url
function convertURL(path) {
  const url = new URL(path);
  url.hostname = 'raw.githubusercontent.com';

  const splitPathname = url.pathname.split('/');
  if (splitPathname.length > 3) {
    githubRepo.protocol = url.protocol;
    githubRepo.host = url.host;
    githubRepo.user = splitPathname[1];
    githubRepo.repo = splitPathname[2];
    githubRepo.branch = splitPathname[4];
  }
  return url.toString().replace('blob/', '');
}

// 拼接github raw文件地址
function getGithubUrl(fileName) {
  return `${githubRepo.protocol}//${githubRepo.host}/${githubRepo.user}/${githubRepo.repo}/${githubRepo.branch}${fileName}`;
}

// 检查文件后缀名
function checkFileType(fileName, fileTypes) {
  const regs = [];
  if (Array.isArray(fileTypes)) {
    fileTypes.forEach(regStr => {
      regs.push(new RegExp(`\.${regStr}`, ''));
    });
  } else {
    regs.push(new RegExp(`\.${fileTypes}`, ''));
  }
  return regs.some(reg => reg.test(fileName));
}

router.get('/', async ctx => {
  ctx.body = 'hello koa';
});

router.get('/htmlBed', async ctx => {
  const { u } = ctx.query;
  const url = convertURL(u);
  const html = await axios.get(url);
  ctx.body = html.data;
});

//处理404
app.use(async (ctx, next) => {
  await next();
  if (parseInt(ctx.status) === 404) {
    const githubFilePath = getGithubUrl(ctx.path);
    // 如果是js或者css文件，不实用redirect，因为回报 MIME type错误
    if (checkFileType(ctx.path, ['css', 'js'])) {
      const response = await axios.get(githubFilePath);
      ctx.body = response.data;
    } else {
      ctx.redirect(githubFilePath);
    }
    // ctx.body = '404';
  }
});

app.use(router.routes()).use(bodyParser());

app.listen(PORT, () => {
  console.log(`app running on http://localhost:${PORT}`);
});
