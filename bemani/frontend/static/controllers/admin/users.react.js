/*** @jsx React.DOM */

var card_management = React.createClass({
    getInitialState: function(props) {
        return {
            users: window.users,
            user_search: {
                card: '',
            },
            searching: false,
        };
    },

    searchUsers: function(event) {
        this.setState({searching: true});
        AJAX.post(
            Link.get('searchusers'),
            {user_search: this.state.user_search},
            function(response) {
                this.setState({
                    users: response.users,
                    searching: false,
                });
            }.bind(this)
        );
        event.preventDefault();
    },

    renderID: function(user) {
        return <span>{user.id}</span>;
    },

    sortID: function(a, b) {
        return a.id - b.id;
    },

    renderUsername: function(user) {
        return user.username ?
            <span>{user.username}</span> :
            <span className="placeholder">anonymous account</span>;
    },

    sortUsername: function(a, b) {
        var au = a.username ? a.username : '';
        var bu = b.username ? b.username : '';
        return au.localeCompare(bu);
    },

    renderEmail: function(user) {
        return user.email ?
            <span>{user.email}</span> :
            <span className="placeholder">no email</span>;
    },

    sortEmail: function(a, b) {
        var ae = a.email ? a.email : '';
        var be = b.email ? b.email : '';
        return ae.localeCompare(be);
    },

    renderEditButton: function(user) {
        return (
            <Nav
                title="view/edit"
                onClick={function(event) {
                    window.location=Link.get('viewuser', user.id);
                }.bind(this)}
            />
        );
    },

    render: function() {
        return (
            <div>
                <section>
                    <h3>User Search</h3>
                    <form onSubmit={this.searchUsers}>
                        <div className="fields">
                            <div className="field half">
                                <input
                                type="text"
                                placeholder="Card Number"
                                className="inline"
                                value={this.state.user_search.card}
                                onChange={function(event) {
                                    var user = this.state.user_search;
                                    user.card = event.target.value;
                                    this.setState({user_search: user});
                                }.bind(this)}
                                name="card"
                                />
                            </div>
                            <div className="field half">
                                <input type="submit" value="search" />
                            </div>
                        </div>
                        { this.state.searching ?
                            <img className="loading" src={Link.get('static', 'loading-16.gif')} /> :
                            null
                        }
                    </form>
                </section>
                <section>
                    <h3>User List</h3>
                    <Table
                        className="list users"
                        columns={[
                            {
                                name: 'ID',
                                render: this.renderID,
                                sort: this.sortID,
                            },
                            {
                                name: 'Username',
                                render: this.renderUsername,
                                sort: this.sortUsername,
                            },
                            {
                                name: 'Email',
                                render: this.renderEmail,
                                sort: this.sortEmail,
                            },
                            {
                                name: '',
                                action: true,
                                render: this.renderEditButton,
                            }
                        ]}
                        rows={this.state.users}
                        emptymessage="No Search result. Or, There are no users to display."
                    />
                </section>
            </div>
        );
    },
});

ReactDOM.render(
    React.createElement(card_management, null),
    document.getElementById('content')
);
