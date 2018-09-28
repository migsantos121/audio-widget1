const nodemailer = require('nodemailer');

module.exports = (router) => {
	router.post('/api/helpdesk', function(req, res) {

		var transporter = nodemailer.createTransport({
				service: 'gmail',
				auth: {
						user: '',
						pass: ''
				}
		});

		var html = "";
		var keys = Object.keys(req.body);
		for (var i = 0; i < keys.length; i ++) {
			html += "<b>" + keys[i] + "</b>" + " : " +  req.body[keys[i]] + "<br>";
		}
		// setup email data with unicode symbols
		let mailOptions = {
				from: 'Andrew Company', // sender address
				to: "migsantos121@outlook.com", // list of receivers
				subject: '[Request Received]Good', // Subject line
				html: html // html body
		};

		transporter.sendMail(mailOptions, (error, info) => {
				if (error) {
						res.json({ success: false, message: error, data: req.body });
						return console.log(error);
				}
				console.log('Message sent: %s', info.messageId);
				console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
				res.json({ success: true, message: "message have sent", data: req.body });
		});
	})
	router.get('*', function(req, res) {
	  res.render("index.html");
	});
	return router;
};