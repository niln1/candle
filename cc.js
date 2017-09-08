// CandlestickChart
// Renders midpoint based candlesticks as a candlestick chart.
// NilN1, 2013

google.charts.load('current', {'packages':['corechart', 'controls']});

window.PRAY = 0
window.DRAY = 0

// todo draw every day, save data every day, then act on change

function CandlestickChart() {}

CandlestickChart.prototype.render = function() {
    var self=this

    //Month granularity in seconds will be based off start time, which may cause synchronization issues while streaming
    //monthly candlesticks. It is unlikely that you will stream monthly candlesticks.

    //Create instance of data table with the proper columns.
    var data = new google.visualization.DataTable();
    data.addColumn('string', 'Date');
    data.addColumn('number', 'Low');
    data.addColumn('number', 'Close');
    data.addColumn('number', 'Open');
    data.addColumn('number', 'High');

    //Preserve self-reference.
    var self = this;

    /* Queries the API for a fixed amount of candles, calls the onComplete method with the completed data set.
     */

    function formatDate(date) {
        var d = new Date(date),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    }

    function getParameterByName(name, url) {
        if (!url) {
          url = window.location.href;
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    function queryFixed(onComplete) {
        var symbol = getParameterByName('tag') ? getParameterByName('tag') : 'TWTR';
        var tspan = Number(getParameterByName('tspan') ? getParameterByName('tspan') : '90');
        var today = new Date()
        var endDate = formatDate(today);
        var startDate = formatDate(new Date().setDate(today.getDate()-tspan))

        $('#csdate').text(startDate)
        $('#csymbol').text(symbol)

        $('#tag').val(symbol)
        $('#tspan').val(tspan)

        $('#tag').on('change', function() {
            document.forms['yo'].submit();
        });

        $('#tspan').on('change', function() {
            document.forms['yo'].submit();
        });

        $.get('https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY&symbol='+symbol+'&outputsize=compact&apikey=407PI64045EYSF24',
        function(response) {
            console.log(response)
            var quotes = response['Weekly Time Series']
            var results = Object.keys(quotes).map(function (key) { return _.merge({}, quotes[key], { key: key }); }).sort(function(a, b) {
              return new Date(b.key)-new Date(a.key)
            })
            var nr = results.slice(0, 100)
            console.log(nr.length)
            console.log(nr)

            nr.forEach(function(quote, i) {
              data.addRow([quote.key, Number(quote['3. low']), Number(quote['4. close']), Number(quote['1. open']), Number(quote['2. high'])]);
            })

            var options = {
              fontSize: 5,
              legend:'none',
              hAxis: {
                direction: -1
              },
              candlestick:{
                fallingColor: { strokeWidth: 0, fill: '#a52714', stroke: '#a52714' }, // red
                risingColor: { strokeWidth: 0, fill: '#0f9d58', stroke: '#0f9d58'  }   // green
              },
              chartArea: {
                width: '100%',
                height: '90%'
              }
            };

            var chart = new google.visualization.CandlestickChart(document.getElementById('chart'));

            google.visualization.events.addListener(chart, 'ready',
                drawHighTurners.bind(chart, data));

            google.visualization.events.addListener(chart, 'ready',
                drawLowTurners.bind(chart, data));

            chart.draw(data, options);

            // ==

            function getLow(x) {
              var sortByLow = data.getSortedRows([{column: 1}]); // sort by low
              var lowest = data.getValue(sortByLow[x], 1)
              return {
                x: sortByLow[x],
                y: lowest
              }
            }

            function isLowTurner(value, row, col, table) {
              var lowData = value
              try {
                var rightData = table.getValue(row - 1, col);
                var leftData = table.getValue(row + 1, col);
                if (leftData > lowData && rightData > lowData) {
                  return true
                }
                return false
              } catch(e) {
                return false
              }
            }

            function isHighTurner(value, row, col, table) {
              var lowData = value
              try {
                var rightData = table.getValue(row - 1, col);
                var leftData = table.getValue(row + 1, col);
                if (leftData < lowData && rightData < lowData) {
                  return true
                }
                return false
              } catch(e) {
                return false
              }
            }

            function getLowTurnerArray(data) {
              var LowTurnersX = data.getFilteredRows([{column: 1, test: isLowTurner}])
              return LowTurnersX
            }

            function getHighTurnerArray(data) {
              var LowTurnersX = data.getFilteredRows([{column: 4, test: isHighTurner}])
              return LowTurnersX
            }

            function drawHighTurners(data) {
              var cli = chart.getChartLayoutInterface();
              var chartArea = cli.getChartAreaBoundingBox();
              var LowTurnersX = getHighTurnerArray(data)


              var dots = LowTurnersX.map(function(each) {
                return getLocation(each, 4)
              })

              var fTrend = futureFunction(dots, function(first, next) {
                if (first.y < next.y) {
                  var dotFirst = drawDot(first, cli, 'red-dot')
                  var dotNext = drawDot(next, cli, 'red-dot')
                  var getY = getStraightLineFunction(dotFirst, dotNext).getY

                  var status = checkInbetween(first, next, function(i) {
                    var dot = drawDot(getLocation(i, 4), cli, '')
                    if (dot.Y < getY(dot.X)) { // get high price open 3 high 4
                      return true
                    }
                    return false
                  })

                  if (status === 'invalid') {
                    drawRay(dotNext, getY, 'black', 0.1)
                    return null
                  } else if (status === false) {
                    drawRay(dotNext, getY, 'black')
                    DRAY++
                    return getY(cli.getXLocation(-1))
                  }

                  return null
                }
              })

              var xxx = fTrend.map(function(each) {
                var dot = {}
                dot.x = -1
                dot.y = getDrawedYToRealY(each, cli)
                var dotD = drawDot(dot, cli, 'red-dot')
                var chartDiv = document.querySelector('#chart > div > div'); // magic selector :()

                chartDiv.appendChild(dotD);
                return dot.y
              })

              var dotElements = dots.map(function(each) {
                return drawDot(each, cli, 'red-dot')
              })

              var chartDiv = document.querySelector('#chart > div > div'); // magic selector :()

              dotElements.forEach(function (each) {
                chartDiv.appendChild(each);
              })
            }

            function futureFunction(dots, cb) {
              var array = []
              for (var i = 0; i< dots.length; i++ ) {
                for (var j = i + 1; j < dots.length; j++ ) {
                  var first = dots[i]
                  var next = dots[j]
                  array.push(cb(first, next))
                }
              }
              return array.filter(function(val) { return val !== null && val !== undefined; })
            }

            function checkInbetween(dot1, dot2, cb) {
              var status = false
              for (var i = dot2.x - 1; i >= 0; i-- ) {
                  if (i > dot1.x) {
                    if (cb(i)) status = true
                  } else {
                    if (cb(i) && status === false) status = 'invalid'
                  }
              }
              return status
            }

            function drawLowTurners(data) {
              var cli = chart.getChartLayoutInterface();
              var chartArea = cli.getChartAreaBoundingBox();
              var LowTurnersX = getLowTurnerArray(data)


              var dots = LowTurnersX.map(function(each) {
                return getLocation(each, 1)
              })

              var fTrend = futureFunction(dots, function(first, next) {
                if (first.y > next.y) {
                  var dotFirst = drawDot(first, cli, 'green-dot')
                  var dotNext = drawDot(next, cli, 'green-dot')
                  var getY = getStraightLineFunction(dotFirst, dotNext).getY

                  var status = checkInbetween(first, next, function(i) {
                    var dot = drawDot(getLocation(i, 1), cli, '')
                    if (dot.Y > getY(dot.X)) { // get low price low 1 close 2 open 3 high 4
                      return true
                    }
                    return false
                  })

                  if (status === 'invalid') {
                    drawRay(dotNext, getY, 'black', 0.1)
                    return null
                  } else if (status === false) {
                    drawRay(dotNext, getY, 'black')
                    PRAY++
                    return getY(cli.getXLocation(-1))
                  }
                  return null
                }
              })

              var xxx = fTrend.map(function(each) {
                var dot = {}
                dot.x = -1
                dot.y = getDrawedYToRealY(each, cli)
                var dotD = drawDot(dot, cli, 'green-dot')
                var chartDiv = document.querySelector('#chart > div > div'); // magic selector :()

                chartDiv.appendChild(dotD);
                return dot.y
              })
              var dotElements = dots.map(function(each) {
                return drawDot(each, cli, 'green-dot')
              })

              var chartDiv = document.querySelector('#chart > div > div'); // magic selector :()

              dotElements.forEach(function (each) {
                chartDiv.appendChild(each);
              })
            }

            function getLocation(x, col) {
              var y = data.getValue(x, col)
              return {
                x: x,
                y: y
              }
            }

            function drawDot(d, cli, className) {
              var x = d.x
              var y = d.y
              var Y = cli.getYLocation(y);
              var X = cli.getXLocation(x)

              var dot = document.createElement("div");    // Create with DOM

              dot.style.top = Y + "px";
              dot.style.left = X + "px";
              dot.className = className;

              dot.x = d.x;
              dot.y = d.y;
              dot.X = X;
              dot.Y = Y;

              return dot
            }
        })
    }

    queryFixed( function(data) { draw(data, false); });

    var svgContainer = this.svgContainer = d3.select("#overlay")
                          .append("svg")
                          .attr("width", window.innerWidth)
                          .attr("height", 800)

    function drawLine(d1, d2, stroke) {
      var stroke = stroke ? stroke : 'black'
      var circle = svgContainer.append("line")
                              .attr("x1", d1.X)
                              .attr("y1", d1.Y)
                              .attr("x2", d2.X)
                              .attr("y2", d2.Y)
                              .attr("stroke-width", 1)
                              .attr("stroke", stroke);

    }

    function getStraightLineFunction(d1, d2) {
      var k = (d2.Y-d1.Y)/(d2.X-d1.X)
      var b = d2.Y-k * (d2.X)

      function getY(x) {
          return (k * x) + b
      }

      function getX(y) {
          return (y - b) / k
      }

      return {
        getY: getY,
        geyX: getX
      }
    }

    function getDrawedYToRealY(y, cli) {
      var Y0 = cli.getYLocation(0)
      var Y100 = cli.getYLocation(100)
      var k = (Y100-Y0)/100
      return (y-Y0)/k
    }

    function drawStraightLine(getY, stroke, opacity) {
         var stroke = stroke ? stroke : 'black'
         var opacity = opacity ? opacity : 1
         var circle = svgContainer.append("line")
                                  .attr("x1", 0)
                                  .attr("y1", getY(0))
                                  .attr("x2", window.innerWidth)
                                  .attr("y2", getY(window.innerWidth))
                                  .attr("stroke-width", 1)
                                  .attr("stroke", stroke)
                                  .attr("stroke-opacity", opacity)

    }

    function drawRay(start, getY, stroke, opacity) {
         var stroke = stroke ? stroke : 'black'
         var opacity = opacity ? opacity : 1
         var circle = svgContainer.append("line")
                                  .attr("x1", start.X)
                                  .attr("y1", start.Y)
                                  .attr("x2", window.innerWidth)
                                  .attr("y2", getY(window.innerWidth))
                                  .attr("stroke-width", 0.5)
                                  .attr("stroke", stroke)
                                  .attr("stroke-opacity", opacity)

    }
};
