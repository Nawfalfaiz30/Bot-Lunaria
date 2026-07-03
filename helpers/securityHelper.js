module.exports = {
    containsLink: (text) => {
        // Mendeteksi segala jenis format URL
        const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
        return urlRegex.test(text);
    },

    isSpamText: (text) => {
        // Mendeteksi jika satu karakter diulang lebih dari 10 kali (misal: "Aaaaaaaaaaaa")
        const charRepeatRegex = /(.)\1{10,}/; 
        return charRepeatRegex.test(text);
    },

    canPunishMember: (interactionOrMessage, targetMember) => {
        const guild = interactionOrMessage.guild;
        const botMember = guild.members.me; 
        const executor = interactionOrMessage.member; 

        if (targetMember.id === guild.ownerId) {
            return { canPunish: false, reason: "Kamu tidak bisa menghukum Pemilik Server!" };
        }
        if (targetMember.id === botMember.id) {
            return { canPunish: false, reason: "Aku tidak bisa menghukum diriku sendiri!" };
        }
        if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
            return { canPunish: false, reason: "Role target lebih tinggi atau sama dengan role-ku." };
        }
        if (executor && targetMember.roles.highest.position >= executor.roles.highest.position && executor.id !== guild.ownerId) {
            return { canPunish: false, reason: "Kamu tidak bisa menghukum pengguna yang memiliki role setara/lebih tinggi darimu." };
        }

        return { canPunish: true, reason: "OK" };
    }
};