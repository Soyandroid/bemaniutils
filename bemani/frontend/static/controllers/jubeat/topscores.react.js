/*** @jsx React.DOM */

var chart_map = [0, 1, 2, 3, 4, 5];
var valid_charts = ['Basic', 'Advanced', 'Extreme', 'Hard Mode Basic', 'Hard Mode Advanced', 'Hard Mode Extreme'].filter(function(val, index) {
    return window.difficulties[window.chart_map[index]] > 0;
});
var pagenav = new History(valid_charts);

var top_scores = React.createClass({

    sortTopScores: function(topscores) {
        var newscores = [[], [], [], []];
        topscores.map(function(score) {
            newscores[score.chart].push(score);
        }.bind(this));
        return newscores;
    },

    getInitialState: function(props) {
        return {
            topscores: this.sortTopScores(window.topscores),
            players: window.players,
            chart: pagenav.getInitialState(valid_charts[0]),
        };
    },

    componentDidMount: function() {
        pagenav.onChange(function(chart) {
            this.setState({chart: chart});
        }.bind(this));
        this.refreshScores();
    },

    refreshScores: function() {
        AJAX.get(
            Link.get('refresh'),
            function(response) {
                this.setState({
                    topscores: this.sortTopScores(response.topscores),
                    players: response.players,
                });
                // Refresh every 15 seconds
                setTimeout(this.refreshScores, 15000);
            }.bind(this)
        );
    },

    convertChart: function(chart) {
        switch(chart) {
            case 'Basic':
                return 0;
            case 'Advanced':
                return 1;
            case 'Extreme':
                return 2;
            case 'Hard Mode Basic':
                return 3;
            case 'Hard Mode Advanced':
                return 4;
            case 'Hard Mode Extreme':
                return 5;
            default:
                return null;
        }
    },

    render: function() {
        var chart = this.convertChart(this.state.chart);

        return (
            <div>
                <div className="section">
                    <div className="songname">{window.name}</div>
                    <div className="songartist">{window.artist}</div>
                    <div className="songdifficulty">{window.difficulties[window.chart_map[chart]]}★</div>
                </div>
                <div className="section">
                    {valid_charts.map(function(chart) {
                        return (
                            <Nav
                                title={chart}
                                active={this.state.chart == chart}
                                onClick={function(event) {
                                    if (this.state.chart == chart) { return; }
                                    this.setState({chart: chart});
                                    pagenav.navigate(chart);
                                }.bind(this)}
                            />
                        );
                    }.bind(this))}
                </div>
                <div className="section">
                    <Table
                        className="list topscores"
                        columns={[
                            {
                                name: 'Name',
                                render: function(topscore) {
                                    return (
                                        <a href={Link.get('player', topscore.userid)}>{
                                            this.state.players[topscore.userid].name
                                        }</a>
                                    );
                                }.bind(this),
                                sort: function(a, b) {
                                    var an = this.state.players[a.userid].name;
                                    var bn = this.state.players[b.userid].name;
                                    return an.localeCompare(bn);
                                }.bind(this),
                            },
                            {
                                name: 'Status',
                                render: function(topscore) { return topscore.status; },
                            },
                            {
                                name: 'Score',
                                render: function(topscore) { return topscore.points; },
                                sort: function(a, b) {
                                    return a.points - b.points;
                                },
                                reverse: true,
                            },
                            {
                                name: 'Combo',
                                render: function(topscore) { return topscore.combo > 0 ? topscore.combo : '-'; },
                            },
                        ]}
                        defaultsort='Score'
                        rows={this.state.topscores[chart]}
                        key={chart}
                        paginate={10}
                        emptymessage="There are no scores for this chart."
                    />
                </div>
            </div>
        );
    },
});

ReactDOM.render(
    React.createElement(top_scores, null),
    document.getElementById('content')
);
