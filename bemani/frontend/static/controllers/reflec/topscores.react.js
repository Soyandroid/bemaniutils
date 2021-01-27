/*** @jsx React.DOM */

var valid_charts = ['Basic', 'Medium', 'Hard', 'Special'].filter(function(val, index) {
    return window.difficulties[index] > 0;
});
var pagenav = new History(valid_charts);

var top_scores = React.createClass({

    sortTopScores: function(topscores) {
        var newscores = [[], [], [], [], []];
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
            case 'Medium':
                return 1;
            case 'Hard':
                return 2;
            case 'Special':
                return 3;
            default:
                return null;
        }
    },

    renderGrade: function(score) {
        if (score.achievement_rate < 6000) {
            return <span>C</span>;
        }
        if (score.achievement_rate < 7000) {
            return <span>B</span>;
        }
        if (score.achievement_rate < 8000) {
            return <span>A</span>;
        }
        if (score.achievement_rate < 9000) {
            return <span>AA</span>;
        }
        if (score.achievement_rate < 9500) {
            return <span>AAA</span>;
        }

        return <span>AAA+</span>;
    },

    render: function() {
        var chart = this.convertChart(this.state.chart);

        return (
            <div>
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
                </section>
                <section>
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
                                name: 'Achievement Rate',
                                render: function(topscore) {
                                    return (
                                        <div>
                                            <span className="bolder clearRate">{this.renderGrade(topscore)}</span> {topscore.achievement_rate/100}%
                                        </div>
                                    );
                                }.bind(this),
                                sort: function(a, b) {
                                    return a.achievement_rate - b.achievement_rate;
                                },
                            },
                            {
                                name: 'Clear Type',
                                render: function(topscore) { return topscore.combo_type + ' ' + topscore.clear_type; },
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
                            {
                                name: 'Miss Count',
                                render: function(topscore) { return topscore.miss_count > 0 ? topscore.miss_count : '-'; },
                            },
                        ]}
                        defaultsort='Score'
                        rows={this.state.topscores[chart]}
                        key={chart}
                        paginate={10}
                        emptymessage="There are no scores for this chart."
                    />
                </section>
            </div>
        );
    },
});

ReactDOM.render(
    React.createElement(top_scores, null),
    document.getElementById('content')
);
