const curl = require("./index");

curl("https://www.baidu.com/", {
  parseBody: true,
  headers: {
    "Accept-Encoding": "gzip, deflate, br",
    Referer: "https://www.cattelanitalia.com/zh/",
    Cookie:
      "ci_session=fc706db656cadd6a475bfff154af7fd5fa0edcab; _fbp=fb.1.1559373253731.899355994; _ga=GA1.2.1054678928.1559373256; _gid=GA1.2.1095301366.1559373256"
  }
}).then(rs => {
  console.log("curl out content:", rs);
});
