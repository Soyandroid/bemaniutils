/*** @jsx React.DOM */

var valid_charts = ['Basic', 'Advanced', 'Extreme', 'Hard Mode Basic', 'Hard Mode Advanced', 'Hard Mode Extreme'];
var pagenav = new History(valid_charts);

var top_scores = React.createClass({

    sortTopScores: function(topscores) {
        var newscores = [[], [], [], [], [], []];
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
            <section>
                <h1>{window.artist} — {window.name}</h1>
                <h3>Difficulty {window.difficulties[chart]}★</h3>
                <p>
                    <SelectVersion
                        name="version"
                        value={ valid_charts.indexOf(this.state.chart) }
                        versions={ valid_charts }
                        onChange={function(chart) {
                            if (this.state.chart == valid_charts[chart]) { return; }
                            this.setState({chart: valid_charts[chart]});
                            pagenav.navigate(valid_charts[chart]);
                        }.bind(this)}
                    />
                </p>
                <h3>Scores</h3>
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
            </section>
        );
    },
});

ReactDOM.render(
    React.createElement(top_scores, null),
    document.getElementById('content')
);
