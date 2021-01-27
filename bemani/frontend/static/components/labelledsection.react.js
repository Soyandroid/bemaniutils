/** @jsx React.DOM */

var LabelledSection = React.createClass({
    render: function() {
        var classname = "inner labelledsection"
        if (this.props.vertical) {
            classname = classname + " vertical";
        } else {
            classname = classname + " horizontal";
        }
        if (this.props.className) {
            classname = classname + " " + this.props.className;
        }
        return (
            <div className={classname}>
                <p className="label">
                    <b>{this.props.label}</b>
                    <br/>
                    {this.props.children}
                </p>
            </div>
        );
    },
});
