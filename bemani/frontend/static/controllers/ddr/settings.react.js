/*** @jsx React.DOM */

var valid_versions = Object.keys(window.versions);
var pagenav = new History(valid_versions);

var option_names = {
    'character': 'Character',
    'arrowskin': 'Arrow Skin',
    'guidelines': 'Guide Lines',
    'filter': 'Filter',
};

var settings_view = React.createClass({

    getInitialState: function(props) {
        var profiles = Object.keys(window.player);
        var version = pagenav.getInitialState(profiles[profiles.length - 1]);
        return {
            player: window.player,
            profiles: profiles,
            version: version,
            new_name: window.player[version].name,
            new_weight: (window.player[version].weight / 10).toFixed(1),
            new_workout_mode: window.player[version].workout_mode,
            options_changed: {},
            options_saving: {},
            options_saved: {},
            editing_name: false,
            editing_weight: false,
            saving_early_late: false,
            saving_background_combo: false,
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

    setOptionsChanged: function(val) {
        this.state.options_changed[this.state.version] = val;
        return this.state.options_changed;
    },

    setOptionsSaving: function(val) {
        this.state.options_saving[this.state.version] = val;
        return this.state.options_saving;
    },

    setOptionsSaved: function(val) {
        this.state.options_saved[this.state.version] = val;
        return this.state.options_saved;
    },

    saveOptions: function(event) {
        this.setState({options_saving: this.setOptionsSaving(true), options_saved: this.setOptionsSaved(false)});
        AJAX.post(
            Link.get('updatesettings'),
            {
                version: this.state.version,
                settings: this.state.player[this.state.version].settings,
            },
            function(response) {
                var player = this.state.player;
                player[response.version].settings = response.player[this.state.version].settings;
                this.setState({
                    player: player,
                    options_saving: this.setOptionsSaving(false),
                    options_saved: this.setOptionsSaved(true),
                    options_changed: this.setOptionsChanged(false),
                });
            }.bind(this)
        );
        event.preventDefault();
    },

    toggleEarlyLate: function(event) {
        this.setState({saving_early_late: true})
        AJAX.post(
            Link.get('updateearlylate'),
            {
                value: !this.state.player[this.state.version].early_late,
                version: this.state.version,
            },
            function(response) {
                var player = this.state.player;
                player[response.version].early_late = response.value;
                this.setState({
                    player: player,
                    saving_early_late: false,
                });
            }.bind(this)
        );
        event.preventDefault();
    },

    toggleBackgroundCombo: function(event) {
        this.setState({saving_background_combo: true})
        AJAX.post(
            Link.get('updatebackgroundcombo'),
            {
                value: !this.state.player[this.state.version].background_combo,
                version: this.state.version,
            },
            function(response) {
                var player = this.state.player;
                player[response.version].background_combo = response.value;
                this.setState({
                    player: player,
                    saving_background_combo: false,
                });
            }.bind(this)
        );
        event.preventDefault();
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

    saveWeight: function(event) {
        AJAX.post(
            Link.get('updateweight'),
            {
                version: this.state.version,
                weight: this.state.new_weight,
                enabled: this.state.new_workout_mode,
            },
            function(response) {
                var player = this.state.player;
                player[response.version].weight = response.weight;
                player[response.version].workout_mode = response.enabled;
                this.setState({
                    player: player,
                    new_weight: (this.state.player[response.version].weight / 10).toFixed(1),
                    new_workout_mode: this.state.player[response.version].workout_mode,
                    editing_weight: false,
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
                        <p>
                            {player.name}
                            <br/>
                            <Edit
                                onClick={function(event) {
                                    this.setState({editing_name: true});
                                }.bind(this)}
                            /> 
                        </p>
                    </span> :
                    <form className="inline" onSubmit={this.saveName}>
                        <input
                            type="text"
                            className="inline"
                            maxlength="8"
                            size="8"
                            autofocus="true"
                            ref={c => (this.focus_element = c)}
                            value={this.state.new_name}
                            onChange={function(event) {
                                var value = event.target.value.toUpperCase();
                                var nameRegex = /^[-&$\\.\\?!A-Z0-9 ]*$/;
                                if (value.length <= 8 && nameRegex.test(value)) {
                                    this.setState({new_name: value});
                                }
                            }.bind(this)}
                            name="name"
                        />
                        <br/>
                        <input
                            className="small"
                            type="submit"
                            value="save"
                        />
                        <input
                            className="small"
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

    renderWeight: function(player) {
        return (
            <LabelledSection vertical={true} label="Weight">{
                !this.state.editing_weight ?
                    <p>
                        { player.workout_mode ?
                            <span>{player.weight / 10} kg</span> :
                            <span className="placeholder">workout mode disabled</span>
                        }
                        <br/>
                        <Edit
                            onClick={function(event) {
                                this.setState({editing_weight: true});
                            }.bind(this)}
                        />
                    </p> :
                    <form className="inline" onSubmit={this.saveWeight}>
                        <div className="row">
                            <input
                                name="enable_workout_mode"
                                id="enable_workout_mode"
                                type="checkbox"
                                className="inline"
                                checked={this.state.new_workout_mode}
                                onChange={function(event) {
                                    this.setState({
                                        new_workout_mode: event.target.checked,
                                    });
                                }.bind(this)}
                            />
                            <label htmlFor="enable_workout_mode">
                                enable workout mode
                            </label>
                        </div>
                        { this.state.new_workout_mode ?
                            <input
                                type="text"
                                className="inline"
                                maxlength="5"
                                size="5"
                                autofocus="true"
                                ref={c => (this.focus_element = c)}
                                value={this.state.new_weight}
                                onChange={function(event) {
                                    var value = event.target.value.toUpperCase();
                                    var weightRegex = /^[0-9]?[0-9]?[0-9]?(\.([0-9])?)?$/;
                                    if (value.length <= 5 && weightRegex.test(value)) {
                                        this.setState({new_weight: value});
                                    }
                                }.bind(this)}
                                name="name"
                            /> :
                            null
                        }
                        <br/>
                        <input
                            className="small"
                            type="submit"
                            value="save"
                        />
                        <input
                            className="small"
                            type="button"
                            value="cancel"
                            onClick={function(event) {
                                this.setState({
                                    new_weight: (this.state.player[this.state.version].weight / 10).toFixed(1),
                                    new_workout_mode: this.state.player[this.state.version].workout_mode,
                                    editing_weight: false,
                                });
                            }.bind(this)}
                        />
                    </form>
            }</LabelledSection>
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
                <div className="inner">
                    <h2>User Profile - {window.versions[this.state.version]}</h2>
                    <section>
                        <p>
                        <h4>Select Version</h4>
                        <SelectVersion
                            name="version"
                            value={ filteredVersion.indexOf(item[this.state.version - 1]) }
                            versions={ filteredVersion }
                            onChange={function(event) {
                                var version = item.indexOf(filteredVersion[event]) + 1
                                if (this.state.editing_name) { return; }
                                if (this.state.version == version) { return; }
                                this.setState({
                                    version: version,
                                    new_name: this.state.player[version].name,
                                });
                                pagenav.navigate(version);
                            }.bind(this)}
                        />
                        </p>
                    </section>
                    <section>
                        {this.renderName(player)}
                        <LabelledSection vertical={true} label="Fast/Slow Display">
                            <p>
                                { this.state.player[this.state.version].early_late ? 'On' : 'Off' }
                                <br/>
                                <Toggle onClick={this.toggleEarlyLate.bind(this)} />
                                { this.state.saving_early_late ?
                                    <img className="loading" src={Link.get('static', 'loading-16.gif')} /> :
                                    null
                                }
                            </p>
                        </LabelledSection>
                        <LabelledSection vertical={true} label="Combo Position">
                            <p>
                                { this.state.player[this.state.version].background_combo ? 'Background' : 'Foreground' }
                                <br/>
                                <Toggle onClick={this.toggleBackgroundCombo.bind(this)} />
                                { this.state.saving_background_combo ?
                                    <img className="loading" src={Link.get('static', 'loading-16.gif')} /> :
                                    null
                                }
                            </p>
                        </LabelledSection>
                        {this.renderWeight(player)}
                    </section>
                    { this.state.player[this.state.version].settings ?
                        <section>
                            <h3>Options</h3>
                            {Object.keys(DDROptions[this.state.version]).map(function(option) {
                                return (
                                    <LabelledSection
                                        className="ddr option"
                                        vertical={true}
                                        label={option_names[option]}
                                    >
                                        <SelectInt
                                            name={option}
                                            value={this.state.player[this.state.version].settings[option]}
                                            choices={DDROptions[this.state.version][option]}
                                            onChange={function(choice) {
                                                var player = this.state.player;
                                                player[this.state.version].settings[option] = choice;
                                                this.setState({
                                                    player: player,
                                                    options_changed: this.setOptionsChanged(true),
                                                });
                                            }.bind(this)}
                                        />
                                    </LabelledSection>
                                );
                            }.bind(this))}
                            <input
                                type="submit"
                                value="save"
                                disabled={!this.state.options_changed[this.state.version]}
                                onClick={function(event) {
                                    this.saveOptions(event);
                                }.bind(this)}
                            />
                            { this.state.options_saving[this.state.version] ?
                                <img className="loading" src={Link.get('static', 'loading-16.gif')} /> :
                                null
                            }
                            { this.state.options_saved[this.state.version] ?
                                <span>{ "\u2713" }</span> :
                                null
                            }
                        </section> : null
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
                        <p>You have no profile for {window.versions[this.state.version]}!</p>
                    </section>
                </div>
            );
        }
    },
});

ReactDOM.render(
    React.createElement(settings_view, null),
    document.getElementById('content')
);
