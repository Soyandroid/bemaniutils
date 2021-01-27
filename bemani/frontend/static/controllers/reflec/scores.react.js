/*** @jsx React.DOM */

var network_scores = React.createClass({
    getInitialState: function(props) {
        return {
            songs: window.songs,
            attempts: window.attempts,
            players: window.players,
            loading: true,
            offset: 0,
            limit: 10,
        };
    },

    componentDidMount: function() {
        this.refreshScores();
    },

    refreshScores: function() {
        AJAX.get(
            Link.get('refresh'),
            function(response) {
                this.setState({
                    attempts: response.attempts,
                    players: response.players,
                    loading: false,
                });
                // Refresh every 15 seconds
                setTimeout(this.refreshScores, 15000);
            }.bind(this)
        );
    },

    convertChart: function(chart) {
        switch(chart) {
            case 0:
                return 'Basic';
            case 1:
                return 'Medium';
            case 2:
                return 'Hard';
            default:
                return 'Special';
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

    renderScore: function(score) {
        return (
            <div className="score">
                <div>
                    <p>
                        <span className="bolder clearRate">{this.renderGrade(score)}</span> {score.achievement_rate/100}%
                        <br/>
                        <span className="bolder">Score:</span> {score.points}
                        <br />
                        <span className="bolder">Combo:</span> {score.combo < 0 ? '-' : score.combo}
                        <br />
                        <span className="bolder">Miss:</span> {score.miss_count < 0 ? '-' : score.miss_count}
                        <br/>
                        <span className="status clearRate">{score.combo_type} {score.clear_type}</span>
                    </p>
                </div>
            </div>
        );
    },

    render: function() {
        return (
            <div>
                <table className="list attempts">
                    <thead>
                        <tr>
                            { window.shownames ? <th>Name</th> : null }
                            <th>Timestamp</th>
                            <th>Song</th>
                            <th>Chart</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.attempts.map(function(attempt, index) {
                            if (index < this.state.offset || index >= this.state.offset + this.state.limit) {
                                return null;
                            }

                            return (
                                <tr>
                                    { window.shownames ? <td><a href={Link.get('player', attempt.userid)}>{
                                        this.state.players[attempt.userid].name
                                    }</a></td> : null }
                                    <td>
                                        <div>
                                            <Timestamp timestamp={attempt.timestamp} />
                                            { window.shownewrecords && attempt.raised ?
                                                <span className="bolder">New High Score!</span> :
                                                null
                                            }
                                        </div>
                                    </td>
                                    <td className="center">
                                        <a href={Link.get('individual_score', attempt.songid)}>
                                            <div className="songname">{ this.state.songs[attempt.songid].name }</div>
                                            <div className="songartist">{ this.state.songs[attempt.songid].artist }</div>
                                        </a>
                                    </td>
                                    <td className="center">
                                        <div>
                                            <a href={Link.get('individual_score', attempt.songid, this.convertChart(attempt.chart))}>{
                                                this.convertChart(attempt.chart)
                                            }</a>
                                        </div>
                                        <div>{
                                            this.state.songs[attempt.songid].difficulties[attempt.chart]
                                        }</div>
                                    </td>
                                    <td>{ this.renderScore(attempt) }</td>
                                </tr>
                            );
                        }.bind(this))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={5}>
                                { this.state.offset > 0 ?
                                    <Prev onClick={function(event) {
                                         var page = this.state.offset - this.state.limit;
                                         if (page < 0) { page = 0; }
                                         this.setState({offset: page});
                                    }.bind(this)}/> : null
                                }
                                { (this.state.offset + this.state.limit) < this.state.attempts.length ?
                                    <Next style={ {float: 'right'} } onClick={function(event) {
                                         var page = this.state.offset + this.state.limit;
                                         if (page >= this.state.attempts.length) { return }
                                         this.setState({offset: page});
                                    }.bind(this)}/> :
                                    this.state.loading ?
                                        <span className="loading" style={ {float: 'right' } }>
                                            <img
                                                className="loading"
                                                src={Link.get('static', 'loading-16.gif')}
                                            /> loading more scores...
                                        </span> : null
                                }
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    },
});

ReactDOM.render(
    React.createElement(network_scores, null),
    document.getElementById('content')
);
