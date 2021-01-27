/*** @jsx React.DOM */

var valid_versions = Object.keys(window.versions);
var pagenav = new History(valid_versions);

var profile_view = React.createClass({

    getInitialState: function(props) {
        var profiles = Object.keys(window.player);
        return {
            player: window.player,
            profiles: profiles,
            version: pagenav.getInitialState(profiles[profiles.length - 1]),
        };
    },

    componentDidMount: function() {
        pagenav.onChange(function(version) {
            this.setState({version: version});
        }.bind(this));
        this.refreshProfile();
    },

    refreshProfile: function() {
        AJAX.get(
            Link.get('refresh'),
            function(response) {
                var profiles = Object.keys(response.player);

                this.setState({
                    player: response.player,
                    profiles: profiles,
                });
                setTimeout(this.refreshProfile, 5000);
            }.bind(this)
        );
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
                        <h3>{player.name}'s profile</h3>
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
                        <LabelledSection label="Total Plays">
                            {player.plays}回
                        </LabelledSection>
                    </section>
                    <section>
                        <LabelledSection label="Home Shop">{player.shop}</LabelledSection>
                        <LabelledSection label="Home Shop Area">{player.shop_area}</LabelledSection>
                    </section>
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
