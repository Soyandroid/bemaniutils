/*** @jsx React.DOM */

var valid_versions = Object.keys(window.versions);
var pagenav = new History(valid_versions);

var valid_emblem_options = [
    'main',
    'background',
    'ornament',
    'effect',
    'speech_bubble',
]

var emblem_option_names = {
    'main': 'Main',
    'background': 'Background',
    'ornament': 'Ornament',
    'effect': 'Effect',
    'speech_bubble': 'Speech Bubble',
}

var settings_view = React.createClass({

    getInitialState: function(props) {
        var profiles = Object.keys(window.player);
        var version = pagenav.getInitialState(profiles[profiles.length - 1]);
        return {
            player: window.player,
            profiles: profiles,
            version: version,
            new_name: window.player[version].name,
            editing_name: false,
            emblem_changed: {},
            emblem_saving: {},
            emblem_saved: {},
        };
    },

    componentDidMount: function() {
        pagenav.onChange(function(version) {
            this.setState({version: version});
        }.bind(this));
    },

    componentDidUpdate: function() {
        if (this.focus_element && this.focus_element != this.already_focused) {
            this.focus_element.focus();
            this.already_focused = this.focus_element;
        }
    },

    setEmblemChanged: function(val) {
        this.state.emblem_changed[this.state.version] = val;
        return this.state.emblem_changed
    },

    setEmblemSaving: function(val) {
        this.state.emblem_saving[this.state.version] = val;
        return this.state.emblem_saving
    },

    setEmblemSaved: function(val) {
        this.state.emblem_saved[this.state.version] = val;
        return this.state.emblem_saved
    },

    saveEmblem: function(event) {
        this.setState({ emblem_saving: this.setEmblemSaving(true), emblem_saved: this.setEmblemSaved(false) })
        AJAX.post(
            Link.get('updateemblem'),
            {
                version: this.state.version,
                emblem: this.state.player[this.state.version].emblem,
            },
            function(response) {
                var player = this.state.player
                player[response.version].emblem = response.emblem
                this.setState({
                    player: player,
                    emblem_saving: this.setEmblemSaving(false),
                    emblem_saved: this.setEmblemSaved(true),
                    emblem_changed: this.setEmblemChanged(false),
                })
            }.bind(this)
        )
    },

    saveName: function(event) {
        AJAX.post(
            Link.get('updatename'),
            {
                version: this.state.version,
                name: this.state.new_name,
            },
            function(response) {
                var player = this.state.player;
                player[response.version].name = response.name;
                this.setState({
                    player: player,
                    new_name: this.state.player[response.version].name,
                    editing_name: false,
                });
            }.bind(this)
        );
        event.preventDefault();
    },

    renderName: function(player) {
        return (
            <LabelledSection vertical={true} label="Name">{
                !this.state.editing_name ?
                    <span>
                        <span>{player.name}</span>
                        <Edit
                            onClick={function(event) {
                                this.setState({editing_name: true});
                            }.bind(this)}
                        />
                    </span> :
                    <form className="inline" onSubmit={this.saveName}>
                        <input
                            type="text"
                            className="inline"
                            maxlength="8"
                            autofocus="true"
                            ref={c => (this.focus_element = c)}
                            size="8"
                            value={this.state.new_name}
                            onChange={function(event) {
                                var value = event.target.value.toUpperCase();
                                var nameRegex = /^[ -&\\.\\*A-Z0-9]*$/;
                                if (value.length <= 8 && nameRegex.test(value)) {
                                    this.setState({new_name: value});
                                }
                            }.bind(this)}
                            name="name"
                        />
                        <input
                            type="submit"
                            value="save"
                        />
                        <input
                            type="button"
                            value="cancel"
                            onClick={function(event) {
                                this.setState({
                                    new_name: this.state.player[this.state.version].name,
                                    editing_name: false,
                                });
                            }.bind(this)}
                        />
                    </form>
            }</LabelledSection>
        );
    },

    renderEmblem: function(player) {
        return (
            <div className="section">
                <h3>Emblem</h3>
                {
                    valid_emblem_options.map(function(emblem_option) {
                        var player = this.state.player[this.state.version]
                        return(
                            <div>
                                <b>{emblem_option_names[emblem_option]}</b>
                                <br/>
                                <input
                                    type="text"
                                    className="inline"
                                    maxlength="4"
                                    size="4"
                                    value={player.emblem[emblem_option]}
                                    onChange={function(event) {
                                        var player = this.state.player;
                                        var value = event.target.value
                                        var numberRegex = /^[0-9]*$/;
                                        if (value.length <= 4 && numberRegex.test(value)) {
                                            player[this.state.version].emblem[emblem_option] = Number(value)
                                            this.setState({
                                                player: player,
                                                emblem_changed: this.setEmblemChanged(true),
                                            })
                                        }
                                    }.bind(this)}
                                    name={emblem_option}
                                />
                                <br/>
                            </div>
                        )
                    }.bind(this))
                }
                <br/>
                <div>
                <input
                    type="submit"
                    value="save"
                    disabled={!this.state.emblem_changed[this.state.version]}
                    onClick={function(event) {
                        this.saveEmblem(event);
                    }.bind(this)}
                />
                { this.state.emblem_saving[this.state.version] ?
                    <img className="loading" src={Link.get('static', 'loading-16.gif')} /> :
                    null
                }
                { this.state.emblem_saved[this.state.version] ?
                    <span>&#x2713;</span> :
                    null
                }
                </div>
            </div>
        )
    },

    render: function() {
        if (this.state.player[this.state.version]) {
            var player = this.state.player[this.state.version];
            return (
                <div>
                    <div className="section">
                        {this.state.profiles.map(function(version) {
                            return (
                                <Nav
                                    title={window.versions[version]}
                                    active={this.state.version == version}
                                    onClick={function(event) {
                                        if (this.state.editing_name) { return; }
                                        if (this.state.version == version) { return; }
                                        this.setState({
                                            version: version,
                                            new_name: this.state.player[version].name,
                                        });
                                        pagenav.navigate(version);
                                    }.bind(this)}
                                />
                            );
                        }.bind(this))}
                    </div>
                    <div className="section">
                        <h3>User Profile</h3>
                        {this.renderName(player)}
                    </div>
                    {this.renderEmblem(player)}
                </div>
            );
        } else {
            return (
                <div>
                    <div className="section">
                        You have no profile for {window.versions[this.state.version]}!
                    </div>
                    <div className="section">
                        {this.state.profiles.map(function(version) {
                            return (
                                <Nav
                                    title={window.versions[version]}
                                    active={this.state.version == version}
                                    onClick={function(event) {
                                        if (this.state.version == version) { return; }
                                        this.setState({
                                            version: version,
                                        });
                                        pagenav.navigate(version);
                                    }.bind(this)}
                                />
                            );
                        }.bind(this))}
                    </div>
                </div>
            );
        }
    },
});

ReactDOM.render(
    React.createElement(settings_view, null),
    document.getElementById('content')
);
