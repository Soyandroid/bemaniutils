/*** @jsx React.DOM */

var valid_versions = Object.keys(window.versions);
var pagenav = new History(valid_versions);

var profile_view = React.createClass({

    getInitialState: function(props) {
        var profiles = Object.keys(window.player);
        return {
            player: window.player,
            profiles: profiles,
            sp_rival: window.sp_rival,
            dp_rival: window.dp_rival,
            version: pagenav.getInitialState(profiles[profiles.length - 1]),
            updating_rivals: false,
        };
    },

    componentDidMount: function() {
        pagenav.onChange(function(version) {
            this.setState({version: version});
        }.bind(this));
        this.refreshProfile();
    },

    refreshProfile: function(skip_timeout) {
        AJAX.get(
            Link.get('refresh'),
            function(response) {
                var profiles = Object.keys(response.player);

                this.setState({
                    player: response.player,
                    profiles: profiles,
                    sp_rival: response.sp_rival,
                    dp_rival: response.dp_rival,
                    updating_rivals: false,
                });
                if (skip_timeout) {
                    // Don't refresh, we were called from rival code
                } else {
                    // Refresh every 5 seconds to show live rival updating
                    setTimeout(this.refreshProfile, 5000);
                }
            }.bind(this)
        );
    },

    addRival: function(event, type) {
        this.setState({updating_rivals: true});
        AJAX.post(
            Link.get('addrival'),
            {
                version: this.state.version,
                type: type,
                userid: window.playerid,
            },
            function(response) {
                this.refreshProfile(true);
            }.bind(this)
        );
        event.preventDefault();
    },

    removeRival: function(event, type, userid) {
        this.setState({updating_rivals: true});
        AJAX.post(
            Link.get('removerival'),
            {
                version: this.state.version,
                type: type,
                userid: window.playerid,
            },
            function(response) {
                this.refreshProfile(true);
            }.bind(this)
        );
        event.preventDefault();
    },

    render: function() {
        if (this.state.player[this.state.version]) {
            var player = this.state.player[this.state.version];
            var filteredVersion = Object.values(this.state.profiles).map(function(version) {
                return Object.values(window.versions)[version-1]
            });
            var item = Object.keys(window.versions).map(function(k){
                return window.versions[k]
            })
            return (
                <div>
                    <section>
                        <h3>DJ {player.name}'s profile</h3>
                        <p>
                            <SelectVersion
                                name="version"
                                value={ filteredVersion.indexOf(item[this.state.version - 1]) }
                                versions={ filteredVersion }
                                onChange={function(event) {
                                    var version = item.indexOf(filteredVersion[event]) + 1
                                    if (this.state.version == version) { return; }
                                    this.setState({version: version});
                                    pagenav.navigate(version);
                                }.bind(this)}
                            />
                        </p>
                    </section>
                    <section>
                        <LabelledSection label="User ID">{player.extid}</LabelledSection>
                        <LabelledSection label="Register Time">
                            <Timestamp timestamp={player.first_play_time}/>
                        </LabelledSection>
                        <LabelledSection label="Last Play Time">
                            <Timestamp timestamp={player.last_play_time}/>
                        </LabelledSection>
                    </section>
                    <section>
                        <LabelledSection className="centered padded filled" label="SP Stats">
                            <div>{player.sdan}</div>
                            <div>{player.sdjp} DJ POINT</div>
                            <div>{player.sp}回</div>
                        </LabelledSection>
                        <LabelledSection className="centered padded filled" label="DP Stats">
                            <div>{player.ddan}</div>
                            <div>{player.ddjp} DJ POINT</div>
                            <div>{player.dp}回</div>
                        </LabelledSection>
                    </section>
                    <section>
                        <p>
                            <a className="button primary small" href={Link.get('records')}>{ window.own_profile ?
                                <span>view your records</span> :
                                <span>view {player.name}'s records</span>
                            }</a>
                            <span>&#9;</span>
                            <a className="button small" href={Link.get('scores')}>{ window.own_profile ?
                                <span>view all your scores</span> :
                                <span>view all {player.name}'s scores</span>
                            }</a>
                        </p>
                    </section>
                    { window.own_profile ? null :
                        <section>
                            { player.sp_rival ?
                                <Delete
                                    title="Remove SP Rival"
                                    onClick={function(event) {
                                        this.removeRival(event, 'sp_rival');
                                    }.bind(this)}
                                /> :
                                <Add
                                    title="Add SP Rival"
                                    onClick={function(event) {
                                        this.addRival(event, 'sp_rival');
                                    }.bind(this)}
                                />
                            }
                            { player.dp_rival ?
                                <Delete
                                    title="Remove DP Rival"
                                    onClick={function(event) {
                                        this.removeRival(event, 'dp_rival');
                                    }.bind(this)}
                                /> :
                                <Add
                                    title="Add DP Rival"
                                    onClick={function(event) {
                                        this.addRival(event, 'dp_rival');
                                    }.bind(this)}
                                />
                            }
                            { this.state.updating_rivals ?
                                <img className="loading" src={Link.get('static', 'loading-16.gif')} /> : null
                            }
                        </section>
                    }
                </div>
            );
        } else {
            var item = Object.keys(window.versions).map(function(k){
                return window.versions[k]
            })
            return (
                <div>
                    <section>
                        <p>
                            <SelectVersion
                                name="version"
                                value={ item.indexOf(item[this.state.version - 1]) }
                                versions={ item }
                                onChange={function(event) {
                                    var version = item.indexOf(item[event]) + 1
                                    if (this.state.version == version) { return; }
                                    this.setState({version: version});
                                    pagenav.navigate(version);
                                }.bind(this)}
                            />
                        </p>
                    </section>
                    <section>
                        <p>This player has no profile for {window.versions[this.state.version]}!</p>
                    </section>
                </div>
            );
        }
    },
});

ReactDOM.render(
    React.createElement(profile_view, null),
    document.getElementById('content')
);
