// CandlestickChart
// Renders midpoint based candlesticks as a candlestick chart.
// NilN1, 2013

/* Constructor: Creates a new chart, sets up default chart and chart display options, creates and binds chart to control.
 * Arguments:
 * dashElement    : DOM object
 * chatElement    : DOM object
 * controlElement : DOM object
 * errorElement   : DOM object
 * candleOpts     : Object
 * dimensionOpts  : Object
 *
 * Refer to README.md for more detailed argument information.
 */

google.charts.load('current', {'packages':['corechart', 'controls']});

function CandlestickChart(dashElement, chartElement, controlElement, errorElement, candleOpts, dimensionOpts) {

}

/* render: Queries the OANDA API for candlesticks in the set time range with the set granulairty, and updates the chart with the data.
 *         If streaming is enabled, a polling loop will be started to fetch and update the chart with new candles.
 */
CandlestickChart.prototype.render = function() {

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
    function queryFixed(onComplete) {

      var svgContainer = d3.select("#overlay")
                            .append("svg")
                            .attr("width", '100%')
                            .attr("height", 800)

        $.get(`https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.historicaldata%20where%20symbol%20%3D%20%22TWTR%22%20and%20startDate%20%3D%20%222016-12-01%22%20and%20endDate%20%3D%20%222017-01-10%22&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=`,
        function(response) {
            var quotes = response.query.results.quote
            console.log(quotes)
            quotes.forEach(function(quote, i) {
              data.addRow([quote.Date, Number(quote.Low), Number(quote.Close), Number(quote.Open), Number(quote.High)]);
            })

            console.log(data)

            // sample
            // Adj_Close:"16.299999"
            // Close:"16.299999"
            // Date:"2016-12-30"
            // High:"16.57"
            // Low:"16.219999"
            // Open:"16.309999"
            // Symbol:"TWTR"
            // Volume:"13923200"
            // onComplete(data)

            var options = {
              legend:'none',
              hAxis: {
                direction: -1
              }
            };

            var chart = new google.visualization.CandlestickChart(document.getElementById('chart'));

            // function placeMarker(dataTable) {
            //     var cli = this.getChartLayoutInterface();
            //     var chartArea = cli.getChartAreaBoundingBox();
            //     document.querySelector('.overlay-marker').style.top = Math.floor(cli.getYLocation(dataTable.getValue(0, 1))) - 0 + "px";
            //     document.querySelector('.overlay-marker').style.left = Math.floor(cli.getXLocation(0)) - 10 + "px";
            // };


//     data.addColumn('string', 'Date');
    // data.addColumn('number', 'Low');
    // data.addColumn('number', 'Close');
    // data.addColumn('number', 'Open');
    // data.addColumn('number', 'High');
            function addLowestDots(dataTable) {
              var cli = this.getChartLayoutInterface();
              var chartArea = cli.getChartAreaBoundingBox();
              var sortByLow = dataTable.getSortedRows([{column: 1}]); // sort by low

              function getLow(x) {
                var lowest = dataTable.getValue(sortByLow[x], 1);

                var Y = cli.getYLocation(lowest);
                var X = cli.getXLocation(sortByLow[x])

                var dot = document.createElement("div");    // Create with DOM

                dot.style.top = Y + "px";
                dot.style.left = X + "px";
                dot.className = 'green-dot';

                dot.X = X;
                dot.Y = Y;

                return dot
              }
              var chartDiv = document.querySelector('#chart > div > div'); // magic selector :()
              chartDiv.appendChild(getLow(0));
              chartDiv.appendChild(getLow(1));
              chartDiv.appendChild(getLow(2));
              drawStraightLine(getLow(0), getLow(1))

            }

            function addTopDots(dataTable) {
              var cli = this.getChartLayoutInterface();
              var chartArea = cli.getChartAreaBoundingBox();
              var sortByLow = dataTable.getSortedRows([{column: 4}]); // sort by low

              function getHigh(x) {
                var top = dataTable.getValue(sortByLow[sortByLow.length-(x+1)], 4);

                var Y = cli.getYLocation(top);
                var X = cli.getXLocation(sortByLow[sortByLow.length-(x+1)])

                var dot = document.createElement("div");    // Create with DOM

                dot.style.top = Y + "px";
                dot.style.left = X + "px";
                dot.className = 'red-dot';
                dot.X = X;
                dot.Y = Y;

                return dot
              }
              var chartDiv = document.querySelector('#chart > div > div'); // magic selector :()
              chartDiv.appendChild(getHigh(0));
              chartDiv.appendChild(getHigh(1));
              chartDiv.appendChild(getHigh(2));
              drawStraightLine(getHigh(0), getHigh(2))
            }

            function drawLine(d1, d2) {
                 var circle = svgContainer.append("line")
                                          .attr("x1", d1.X)
                                          .attr("y1", d1.Y)
                                          .attr("x2", d2.X)
                                          .attr("y2", d2.Y)
                                          .attr("stroke-width", 2)
                                          .attr("stroke", "black");

            }

            function drawStraightLine(d1, d2) {
                var k = (d2.Y-d1.Y)/(d2.X-d1.X)
                var b = d2.Y-k * (d2.X)

                function getY(x) {
                    return (k * x) + b
                }

                function getX(y) {
                    return (y - b) / k
                }

                 var circle = svgContainer.append("line")
                                          .attr("x1", 0)
                                          .attr("y1", getY(0))
                                          .attr("x2", window.innerWidth)
                                          .attr("y2", getY(window.innerWidth))
                                          .attr("stroke-width", 2)
                                          .attr("stroke", "black");

            }


            // google.visualization.events.addListener(chart, 'ready',
            //     placeMarker.bind(chart, data));

            google.visualization.events.addListener(chart, 'ready',
                addLowestDots.bind(chart, data));

            google.visualization.events.addListener(chart, 'ready',
                addTopDots.bind(chart, data));

            chart.draw(data, options);
        })
    }

    queryFixed( function(data) { draw(data, false); });

    /*
     * Renders the data to the chart; Animation is optional since it really messes up the
     * sliding action of the chart control.
     */
    function draw(data, animate) {
        //Set up extra chart options.
        self.chartOpts.title = self.instrument + " Candlesticks";
        if(animate) {
            self.chartOpts.animation = { 'duration' : 1000, 'easing' : 'out' };
        }
        self.chartOpts.candlestick = {
          fallingColor: { strokeWidth: 0, fill: '#a52714', stroke: '#a52714' }, // red
          risingColor: { strokeWidth: 0, fill: '#0f9d58', stroke: '#0f9d58'  }   // green
        }
        // self.colors = ['red','#004411']
        // self.chartOpts.legend = { 'position' : 'none' };
        //Set up extra control options:
        // self.controlOpts.ui.minRangeSize = granSecs * 2;
        //Reset the state of the control so the sliders stay in bounds.
        // self.control.setState({ 'start' : data.getColumnRange(0).min, 'end' :  data.getColumnRange(0).max});

        self.chart.setOptions(self.chartOpts);
        // self.control.setOptions(self.controlOpts);
        self.chart.draw(data);
    }
};


/* 'Static' utility functions
 */
CandlestickChart.util = {
    'getDaysInMonth' : function(year, month) {
        var start = new Date(year, month, 1);
        var end = new Date(year, parseInt(month, 10) + 1, 1);
        return (end - start)/(1000 * 60 * 60 * 24);
    },
};
