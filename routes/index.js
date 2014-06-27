var express = require('express');
var router = express.Router();
var cheerio = require("cheerio");
var iconv = require('iconv-lite');
var http = require('http');
var mysql = require('mysql');
var db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'mykar'
});
/* GET home page. */
router.get('/', function (req, res) {
  //res.writeHeader(200,{'Content-Type':'text/javascript;charset=UTF-8'});
  res.render('index', {
    title: '小爬虫'
  });
});

router.post('/', function (req, res) {
  var url = req.body.url;
  var data = {};
  //res.writeHeader(200,{'Content-Type':'text/javascript;charset=UTF-8'});
  http.get(url, function (response) {
    response.setEncoding('binary');
    var chunk = '';
    response.on('data', function (data) {
      chunk += data;
    });

    response.on('end', function () {
      var buf = new Buffer(chunk, 'binary');
      var str = iconv.decode(buf, 'GBK');
      var data = {};
      var $ = cheerio.load(str);
      var brand = $(".list-dl > dt a").text();
      console.log(brand);
      db.query(
        "SELECT * FROM car_brand WHERE brand_name = ?",
        brand,
        function (err, rows, fields) {
          if (err) {
            console.log(err);
          }
          console.log(rows[0].brand_id);
          if (!rows.length) {
            console.log("no query");
          }

        }
      );
      $(".tab-content-item > div").each(function () {
        if ($(this).attr("data-value")) {
          var dataValue = $(this).attr("data-value");
          var cx = $(this).find('a[class=font-bold]').text();
          var czID = '#divSpecList' + dataValue;
          var tmp = [];
          $(czID).find('p[class=infor-title]').children('a').each(function () {
            var carName = $(this).text();
            tmp.push(carName);
            data[cx] = tmp;
          });
        }
      });
      console.log(data);
      res.writeHeader(200, {
        'Content-Type': 'text/javascript;charset=UTF-8'
      });
      res.end(JSON.stringify(data));
      //return res.render('index', {'codes':JSON.stringify(data)});
    });



  });

});



router.post('/db', function (req, res) {
  var url = req.body.sqlURL;
  http.get(url, function (response) {
    response.setEncoding('binary');
    var chunk = '';
    response.on('data', function (data) {
      chunk += data;
    });

    response.on('end', function () {
      var buf = new Buffer(chunk, 'binary');
      var str = iconv.decode(buf, 'GBK');
      //console.log(str);
      var $ = cheerio.load(str);
      //var brand = $(".list-dl > dt a").text();
      var brand =$(".uibox-title > h2 a").text();
      console.log(brand);
      db.query(
        "SELECT * FROM car_brand WHERE brand_name = ?",
        brand,
        function (err, rows) {
          if (err) {
            return console.log(err);
            
          }
          console.log(rows);
          //如果查询到当前品牌
          if (rows.length) {
            $(".tab-content-item > div").each(function () {
              //得到车型div
              var dataValue = $(this).attr("data-value");
              if (dataValue) {
                //得到车型id
                var czID = '#divSpecList' + dataValue;
                //车系名
                var cx = $(this).find('div[class=main-title]').find('a[class=font-bold]').text();
                console.log(cx);
                db.query(
                  "SELECT * FROM car_series WHERE series_name = ?",
                  cx,
                  function (err, cxRES) {
                    if (err) {
                      return console.log(err);
                    }
                    //如果在数据库中存在这个车系
                    if (cxRES.length) {
                      $(czID).find('p[class=infor-title]').children('a').each(function () {
                        //车名
                        var carName = $(this).text();
                        db.query(
                          "INSERT INTO car_info (brand_id, series_id, car_name) VALUES(?,?,?)", [rows[0].brand_id, cxRES[0].series_id, carName],
                          function (err) {
                            if (err) {
                              return console.log(err);
                            }
                            console.log("has car_series");
                            return res.render("index", {title:brand, codes:url})
                          }
                        );

                      });

                    } else {
                      db.query(
                        "INSERT INTO car_series (brand_id, series_name) VALUES(?,?)", [rows[0].brand_id, cx],
                        function (err, cxRES) {

                          //console.log(cxRES);
                          if (err) {
                            return console.log(err);
                          }
                          $(czID).find('p[class=infor-title]').children('a').each(function () {
                            var carName = $(this).text();
                            db.query(
                              "INSERT INTO car_info (brand_id, series_id, car_name) VALUES(?,?,?)", [rows[0].brand_id, cxRES.insertId, carName],
                              function (err) {
                                if (err) {
                                  console.log(err);
                                }
                                console.log("new car_series");
                                //res.end("ok2");
                                return res.render("index", {title:brand, codes:url})
                              }
                            );
                          });

                        }
                      );


                    }

                  }


                );

              }

            });


          }
        }

      );

    });

  });
});


module.exports = router;