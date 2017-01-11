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

            function placeMarker(dataTable) {
                var cli = this.getChartLayoutInterface();
                var chartArea = cli.getChartAreaBoundingBox();
                document.querySelector('.overlay-marker').style.top = Math.floor(cli.getYLocation(dataTable.getValue(0, 1))) - 0 + "px";
                document.querySelector('.overlay-marker').style.left = Math.floor(cli.getXLocation(0)) - 10 + "px";
            };

            google.visualization.events.addListener(chart, 'ready',
                placeMarker.bind(chart, data));

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

/* Clears the chart and control with their internal reset methods and cancels and polling.
 */
CandlestickChart.prototype.reset = function() {

    // if(this.control) {
    //     var controlHandle = this.control.getControl();
    //     controlHandle.resetControl();
    // }

    if(this.chart) {
        var chartHandle = this.chart.getChart();
        chartHandle.clearChart();
    }

    if(this.callbacks.interval > 0) {
        clearInterval(this.callbacks.interval);
    }

    if(this.callbacks.timeout > 0) {
        clearTimeout(this.callbacks.timeout);
    }
};

/* Changes the granularity of the candles displayed on the chart. Will reset the chart.
 */
CandlestickChart.prototype.setGranularity = function(granularity) {

    if(this.granularities.indexOf(granularity) < 0) {
        this.timedError("Not a valid granularity!");
    } else {
        this.granularity = granularity;
        this.reset();
        this.render();
    }
    return this.granularity;
};

/* Changes the instrument of the candles shown in the chart. Will reset the chart.
 */
CandlestickChart.prototype.setInstrument = function(instrument) {

    this.instrument = instrument;
    this.reset();
    this.render();
    return this.instrument;
};

/* Changes the start time of the displayed candles. Will reset the chart.
 */
CandlestickChart.prototype.setStartTime = function(params) {


    var newStartTime = new Date(params.year    || this.startTime.getFullYear(),
                                params.month   || this.startTime.getMonth(),
                                params.day     || this.startTime.getDate(),
                                params.hours   || this.startTime.getHours(),
                                params.minutes || this.startTime.getMinutes(),
                                params.seconds || this.startTime.getSeconds());

    if(newStartTime >= this.endTime.getTime()) {
        this.timedError("Start time set to be greater than or equal to end time");
    } else {
        this.startTime = newStartTime;
        this.reset();
        this.render();
    }
    return this.startTime;
};

/* Changes the end time of the displayed candles. Will reset the chart.
 */
CandlestickChart.prototype.setEndTime = function(params) {

    var newEndTime  = new Date(params.year    || this.endTime.getFullYear(),
                               params.month   || this.endTime.getMonth(),
                               params.day     || this.endTime.getDate(),
                               params.hours   || this.endTime.getHours(),
                               params.minutes || this.endTime.getMinutes(),
                               params.seconds || this.endTime.getSeconds());

    if(newEndTime <= this.startTime.getTime()) {
        this.timedError("End time set less than or equal to start time.");
    } else {
        this.endTime = newEndTime;
        this.reset();
        this.render();
    }
    return this.endTime;
};

/* Toggles streaming on & off.
 */
CandlestickChart.prototype.toggleStreaming = function(streamingEnabled) {

    this.streamingEnabled = streamingEnabled;
    this.endTime = new Date();
    this.reset();
    this.render();
};

/*
 * Displays and error string for the specified amount of time to the DOM object which acts as the error container.
 */
CandlestickChart.prototype.timedError = function(errorString, timeout) {

    var error = google.visualization.errors.addError(this.parentContainer, errorString, "",
            {'type' : 'error',
             'style' : 'font-size:1em;'});
    setTimeout(function() {google.visualization.errors.removeError(error);}, timeout || 5000);

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
