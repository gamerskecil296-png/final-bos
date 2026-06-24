package utils

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"strings"

	"siakad-backend/models"
)

// wrapInAcademicTemplate wraps the content in a formal, minimalist academic HTML template
func wrapInAcademicTemplate(body string) string {
	// Remove emojis like 👉 to keep it strictly formal if they exist in the DB text
	body = strings.ReplaceAll(body, "👉", "")
	bodyHTML := strings.ReplaceAll(body, "\n", "<br>")
	
	return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Universitas Bhakti Kencana</title>
    <style>
        body { font-family: 'Times New Roman', Times, serif; background-color: #ffffff; margin: 0; padding: 0; color: #000000; }
        .container { max-width: 600px; margin: 30px auto; padding: 40px; border: 1px solid #cccccc; }
        .header { text-align: center; border-bottom: 2px solid #000000; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 20px; font-weight: normal; text-transform: uppercase; letter-spacing: 1px; }
        .content { line-height: 1.6; font-size: 16px; text-align: justify; }
        .footer { text-align: center; font-size: 12px; color: #666666; margin-top: 40px; padding-top: 20px; border-top: 1px solid #cccccc; }
        .otp-box { text-align: center; margin: 30px 0; font-size: 24px; font-weight: bold; letter-spacing: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Universitas Bhakti Kencana</h1>
        </div>
        <div class="content">
            ` + bodyHTML + `
        </div>
        <div class="footer">
            <p>Email ini dihasilkan secara otomatis oleh Sistem Informasi Akademik.<br>Mohon untuk tidak membalas email ini.</p>
        </div>
    </div>
</body>
</html>`
}

// SendEmailHTML sends an HTML email using the provided SMTP settings
func SendEmailHTML(setting models.SmtpSetting, toEmail, subject, body string) error {
	fullHTML := wrapInAcademicTemplate(body)

	msg := "From: " + setting.FromAddress + "\r\n" +
		"To: " + toEmail + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=\"UTF-8\"\r\n\r\n" +
		fullHTML

	auth := smtp.PlainAuth("", setting.Username, setting.Password, setting.Host)

	addr := fmt.Sprintf("%s:%s", setting.Host, setting.Port)

	// In case of TLS
	tlsconfig := &tls.Config{
		InsecureSkipVerify: true,
		ServerName:         setting.Host,
	}

	conn, err := tls.Dial("tcp", addr, tlsconfig)
	if err != nil {
		// Fallback to plain dial if TLS dial fails, maybe it's starttls
		return sendMailStartTLS(addr, auth, setting.FromAddress, []string{toEmail}, []byte(msg), setting)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, setting.Host)
	if err != nil {
		return err
	}

	// Auth
	if err = client.Auth(auth); err != nil {
		return err
	}

	// To && From
	if err = client.Mail(setting.FromAddress); err != nil {
		return err
	}

	if err = client.Rcpt(toEmail); err != nil {
		return err
	}

	// Data
	w, err := client.Data()
	if err != nil {
		return err
	}

	_, err = w.Write([]byte(msg))
	if err != nil {
		return err
	}

	err = w.Close()
	if err != nil {
		return err
	}

	return client.Quit()
}

func sendMailStartTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte, setting models.SmtpSetting) error {
	// Standard smtp.SendMail uses STARTTLS if available
	return smtp.SendMail(addr, auth, from, to, msg)
}

// FormatOtpTemplate replaces placeholders in the template with actual values
func FormatOtpTemplate(template, otp, name string, lifetime int) string {
	res := template
	// Uppercase placeholders
	res = strings.ReplaceAll(res, "{{NAMA}}", name)
	res = strings.ReplaceAll(res, "{{OTP}}", otp)
	res = strings.ReplaceAll(res, "{{LIFETIME}}", fmt.Sprintf("%d", lifetime))
	
	// Lowercase placeholders (fallback)
	res = strings.ReplaceAll(res, "{{nama}}", name)
	res = strings.ReplaceAll(res, "{{otp}}", otp)
	res = strings.ReplaceAll(res, "{{lifetime}}", fmt.Sprintf("%d", lifetime))

	// If OTP is still not in the body, append it nicely formatted
	if !strings.Contains(template, "{{OTP}}") && !strings.Contains(template, "{{otp}}") {
		res += `<div class="otp-box">` + otp + `</div>`
	} else {
		// If they did use {{OTP}}, try to replace it with a centered box
		res = strings.ReplaceAll(res, otp, `</div><div class="otp-box">`+otp+`</div><div class="content">`)
	}
	return res
}
