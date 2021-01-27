/*** @jsx React.DOM */

var card_management = React.createClass({
    getInitialState: function(props) {
        return {
            cards: window.cards,
            newCard: '',
        };
    },

    componentDidMount: function() {
        this.refreshCardList();
    },

    addNewCard: function(event) {
        AJAX.post(
            Link.get('addcard'),
            {card: this.state.newCard},
            function(response) {
                this.setState({
                    cards: response.cards,
                    newCard: '',
                });
            }.bind(this)
        );
        event.preventDefault();
    },

    deleteExistingCard: function(card) {
        $.confirm({
            escapeKey: 'Cancel',
            animation: 'none',
            closeAnimation: 'none',
            title: 'Delete Card',
            content: 'Are you sure you want to delete this card from your account?',
            buttons: {
                Delete: {
                    btnClass: 'delete',
                    action: function() {
                        AJAX.post(
                            Link.get('removecard'),
                            {card: card},
                            function(response) {
                                this.setState({
                                    cards: response.cards,
                                    newCard: '',
                                });
                            }.bind(this)
                        );
                    }.bind(this),
                },
                Cancel: function() {
                },
            }
        });
    },

    refreshCardList: function() {
        AJAX.get(
            Link.get('listcards'),
            function(response) {
                this.setState({
                    cards: response.cards,
                });
                setTimeout(this.refreshCardList, 2500);
            }.bind(this)
        );
    },

    render: function() {
        return (
            <div>
                <h3>Your Cards</h3>
                {
                    <table>
                        <thead>
                            <tr>
                                <th>Card Number</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                        {
                            this.state.cards.map(function(card) {
                                return (
                                    <tr>
                                        <td>
                                            <Card number={card} />
                                        </td>
                                        <td>
                                            <Delete
                                                onClick={this.deleteExistingCard.bind(this, card)}
                                            />
                                        </td>
                                    </tr>
                                );
                            }.bind(this))
                        }
                        </tbody>
                    </table>
                }
                <h3>Add Card</h3>
                <form onSubmit={this.addNewCard}>
                    <div className="fields">
                        <div className="field">
                            <input
                                type="text"
                                className="inline"
                                placeholder="Card Number"
                                value={this.state.newCard}
                                onChange={function(event) {
                                    this.setState({newCard: event.target.value});
                                }.bind(this)}
                                name="card_number"
                            />
                        </div>
                        <div className="field">
                            <input type="submit" value="add card" />
                        </div>
                    </div>
                </form>
            </div>
        );
    },
});

ReactDOM.render(
    React.createElement(card_management, null),
    document.getElementById('content')
);
