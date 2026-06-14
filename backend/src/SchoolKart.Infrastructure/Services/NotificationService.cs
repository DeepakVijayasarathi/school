using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using SchoolKart.Application.Common;
using SchoolKart.Domain.Entities;

namespace SchoolKart.Infrastructure.Services;

public interface INotificationService
{
    Task<List<NotificationLog>> SendSmsAsync(Guid tenantId, IEnumerable<string> phones, string message, CancellationToken ct = default);
    Task<List<NotificationLog>> SendEmailAsync(Guid tenantId, IEnumerable<string> emails, string subject, string body, CancellationToken ct = default);
    Task<List<NotificationLog>> SendWhatsAppAsync(Guid tenantId, IEnumerable<string> phones, string message, string? templateId, CancellationToken ct = default);
    Task SendAnnouncementAsync(Announcement announcement, CancellationToken ct = default);
}

public class NotificationService(IConfiguration config) : INotificationService
{
    public async Task<List<NotificationLog>> SendSmsAsync(Guid tenantId, IEnumerable<string> phones, string message, CancellationToken ct = default)
    {
        var logs = new List<NotificationLog>();
        var accountSid = config["Twilio:AccountSid"];
        var authToken = config["Twilio:AuthToken"];
        var fromNumber = config["Twilio:FromNumber"];

        if (string.IsNullOrEmpty(accountSid) || string.IsNullOrEmpty(authToken))
        {
            // Log as pending if Twilio not configured
            return phones.Select(p => new NotificationLog
            {
                TenantId = tenantId,
                Channel = "sms",
                Recipient = p,
                Body = message,
                Status = "pending",
                Error = "Twilio not configured"
            }).ToList();
        }

        TwilioClient.Init(accountSid, authToken);

        foreach (var phone in phones)
        {
            var log = new NotificationLog
            {
                TenantId = tenantId,
                Channel = "sms",
                Recipient = phone,
                Body = message
            };

            try
            {
                var msg = await MessageResource.CreateAsync(
                    body: message,
                    from: new Twilio.Types.PhoneNumber(fromNumber),
                    to: new Twilio.Types.PhoneNumber(phone));

                log.Status = "sent";
                log.SentAt = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                log.Status = "failed";
                log.Error = ex.Message;
            }

            logs.Add(log);
        }

        return logs;
    }

    public async Task<List<NotificationLog>> SendEmailAsync(Guid tenantId, IEnumerable<string> emails, string subject, string body, CancellationToken ct = default)
    {
        var logs = new List<NotificationLog>();
        var smtpHost = config["Email:SmtpHost"];
        var smtpPort = int.Parse(config["Email:SmtpPort"] ?? "587");
        var username = config["Email:Username"];
        var password = config["Email:Password"];
        var fromEmail = config["Email:From"] ?? "noreply@schoolkart.com";
        var fromName = config["Email:FromName"] ?? "SchoolKart";

        if (string.IsNullOrEmpty(smtpHost))
        {
            return emails.Select(e => new NotificationLog
            {
                TenantId = tenantId,
                Channel = "email",
                Recipient = e,
                Subject = subject,
                Body = body,
                Status = "pending",
                Error = "SMTP not configured"
            }).ToList();
        }

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls, ct);
        await smtp.AuthenticateAsync(username, password, ct);

        foreach (var email in emails)
        {
            var log = new NotificationLog
            {
                TenantId = tenantId,
                Channel = "email",
                Recipient = email,
                Subject = subject,
                Body = body
            };

            try
            {
                var mime = new MimeMessage();
                mime.From.Add(new MailboxAddress(fromName, fromEmail));
                mime.To.Add(MailboxAddress.Parse(email));
                mime.Subject = subject;
                mime.Body = new TextPart("html") { Text = body };

                await smtp.SendAsync(mime, ct);
                log.Status = "sent";
                log.SentAt = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                log.Status = "failed";
                log.Error = ex.Message;
            }

            logs.Add(log);
        }

        await smtp.DisconnectAsync(true, ct);
        return logs;
    }

    public async Task<List<NotificationLog>> SendWhatsAppAsync(Guid tenantId, IEnumerable<string> phones, string message, string? templateId, CancellationToken ct = default)
    {
        // WhatsApp Business API integration placeholder
        // Requires Meta WhatsApp Business API or Twilio WhatsApp sandbox
        return phones.Select(p => new NotificationLog
        {
            TenantId = tenantId,
            Channel = "whatsapp",
            Recipient = p,
            Body = message,
            Status = "pending",
            Error = "WhatsApp API integration required"
        }).ToList();
    }

    public async Task SendAnnouncementAsync(Announcement announcement, CancellationToken ct = default)
    {
        // In production: queue this to RabbitMQ for async processing
        // Worker reads from queue and sends based on channels
        await Task.CompletedTask;
    }
}
