/** @jsx React.DOM */

var SelectVersion = React.createClass({
    render: function() {
        return (
            <select
                name={this.props.name}
                disabled={this.props.disabled}
                value={this.props.value ? this.props.value : "__NOTHING_VALUE__"}
                onChange={function(event) {
                    var version = event.target.value;
                    if (version == "__NOTHING_VALUE__") {
                        version = null;
                    }
                    if (this.props.onChange) {
                        this.props.onChange(version);
                    }
                }.bind(this)}
            >
                {Object.keys(this.props.versions).map(function(index) {
                    return <option value={index}>{ this.props.versions[index] }</option>;
                }.bind(this))}
            </select>
        );
    },
});
