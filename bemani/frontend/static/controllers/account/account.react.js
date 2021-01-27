/*** @jsx React.DOM */

var account_management = React.createClass({
    getInitialState: function(props) {
        return {
            email: window.email,
            new_email: window.email,
            email_password: '',
            editing_email: false,
            username: window.username,
            editing_pin: false,
            new_pin: '',
            editing_password: false,
            old_password: '',
            new_password1: '',
            new_password2: '',
        };
    },

    componentDidUpdate: function() {
        if (this.focus_element && this.focus_element != this.already_focused) {
            this.focus_element.focus();
            this.already_focused = this.focus_element;
        }
    },

    saveEmail: function(event) {
        AJAX.post(
            Link.get('updateemail'),
            {
                email: this.state.new_email,
                password: this.state.email_password,
            },
            function(response) {
                this.setState({
                    email: response.email,
                    new_email: response.email,
                    email_password: '',
                    editing_email: false,
                });
            }.bind(this)
        );
        event.preventDefault();
    },

    savePin: function(event) {
        AJAX.post(
            Link.get('updatepin'),
            {pin: this.state.new_pin},
            function(response) {
                this.setState({
                    new_pin: '',
                    editing_pin: false,
                });
            }.bind(this)
        );
        event.preventDefault();
    },

    savePassword: function(event) {
        AJAX.post(
            Link.get('updatepassword'),
            {
                old: this.state.old_password,
                new1: this.state.new_password1,
                new2: this.state.new_password2,
            },
            function(response) {
                this.setState({
                    old_password: '',
                    new_password1: '',
                    new_password2: '',
                    editing_password: false,
                });
            }.bind(this)
        );
        event.preventDefault();
    },

    renderUsername: function() {
        return (
            <LabelledSection vertical={true} label="Username">{ this.state.username }</LabelledSection>
        );
    },

    renderPassword: function() {
        return (
            <form className="inline" onSubmit={this.savePassword}>
                {
                    !this.state.editing_password ?
                    <div className="fields">
                        <div className="field">
                            <b>Password</b>
                            <br/>
                            &bull;&bull;&bull;&bull;&bull;&bull;
                        </div>
                        <div className="field">
                            <Edit
                                onClick={function(event) {
                                    this.setState({editing_password: true});
                                }.bind(this)}
                            />
                        </div>
                    </div>
                    :
                    <div className="fields">
                        <div className="field">
                            <b>Change Password</b>
                        </div>
                        <div className="field">
                            <label for="old">Current password:</label>
                            <input
                                type="password"
                                autofocus="true"
                                ref={c => (this.focus_element = c)}
                                value={this.state.old_password}
                                onChange={function(event) {
                                    this.setState({old_password: event.target.value});
                                }.bind(this)}
                                name="old"
                            />
                        </div>
                        <div className="field">
                            <label for="new1">New password:</label>
                            <input
                                type="password"
                                value={this.state.new_password1}
                                onChange={function(event) {
                                    this.setState({new_password1: event.target.value});
                                }.bind(this)}
                                name="new1"
                            />
                        </div>
                        <div className="field">
                            <label for="new2">New password (again):</label>
                            <input
                                type="password"
                                value={this.state.new_password2}
                                onChange={function(event) {
                                    this.setState({new_password2: event.target.value});
                                }.bind(this)}
                                name="new2"
                            />
                        </div>
                        <div className="field">
                            <input
                                type="submit"
                                value="save"
                            />
                            <input
                                type="button"
                                value="cancel"
                                onClick={function(event) {
                                    this.setState({
                                        old_password: '',
                                        new_password1: '',
                                        new_password2: '',
                                        editing_password: false,
                                    });
                                }.bind(this)}
                            />
                        </div>
                    </div>
                }
            </form>
        );
    },

    renderEmail: function() {
        return (
            <form className="inline" onSubmit={this.saveEmail}>
                {
                    !this.state.editing_email ?
                        <div className="fields">
                            <div className="field">
                                <b>Email</b>
                                <br/>
                                { this.state.email }
                            </div>
                            <div className="field">
                                <Edit
                                    onClick={function(event) {
                                        this.setState({editing_email: true});
                                    }.bind(this)}
                                />
                            </div>
                        </div>
                        :
                        <div className="fields">
                            <div className="field">
                                <b>Change Email</b>
                            </div>
                            <div className="field">
                                <label for="old">Current password:</label>
                                <input
                                    type="password"
                                    autofocus="true"
                                    ref={c => (this.focus_element = c)}
                                    value={this.state.email_password}
                                    onChange={function(event) {
                                        this.setState({email_password: event.target.value});
                                    }.bind(this)}
                                    name="old"
                                />
                            </div>
                            <div className="field">
                                <label for="email">New email address:</label>
                                <input
                                    type="text"
                                    value={this.state.new_email}
                                    onChange={function(event) {
                                        this.setState({new_email: event.target.value});
                                    }.bind(this)}
                                    name="email"
                                />
                            </div>
                            <div className="field">
                                <input
                                    type="submit"
                                    value="save"
                                />
                                <input
                                    type="button"
                                    value="cancel"
                                    onClick={function(event) {
                                        this.setState({
                                            new_email: this.state.email,
                                            email_password: '',
                                            editing_email: false,
                                        });
                                    }.bind(this)}
                                />
                            </div>
                        </div>
                }
            </form>
        );
    },

    renderPIN: function() {
        return (
            <form className="inline" onSubmit={this.savePin}>
                {
                    !this.state.editing_pin ?
                    <div className="fields">
                        <div className="field">
                            <b>PIN</b>
                            <br/>
                            &bull;&bull;&bull;&bull;
                        </div>
                        <div className="field">
                            <Edit
                                onClick={function(event) {
                                    this.setState({editing_pin: true});
                                }.bind(this)}
                            />
                        </div>
                    </div>
                    :
                    <div className="fields">
                        <div className="field">
                            <b>Change PIN</b>
                        </div>
                        <div className="field">
                            <input
                                type="text"
                                className="inline"
                                maxlength="4"
                                size="4"
                                autofocus="true"
                                ref={c => (this.focus_element = c)}
                                value={this.state.new_pin}
                                onChange={function(event) {
                                    var intRegex = /^\d*$/;
                                    if (event.target.value.length <= 4 && intRegex.test(event.target.value)) {
                                        this.setState({new_pin: event.target.value});
                                    }
                                }.bind(this)}
                                name="pin"
                            />
                        </div>
                        <div className="field">
                            <input
                                type="submit"
                                value="save"
                            />
                            <input
                                type="button"
                                value="cancel"
                                onClick={function(event) {
                                    this.setState({
                                        new_pin: '',
                                        editing_pin: false,
                                    });
                                }.bind(this)}
                            />
                        </div>
                    </div>
                }
            </form>
        );
    },

    render: function() {
        return (
            <section>
                {this.renderUsername()}
                {this.renderPassword()}
                {this.renderEmail()}
                {this.renderPIN()}
            </section>
        );
    },
});

ReactDOM.render(
    React.createElement(account_management, null),
    document.getElementById('content')
);
