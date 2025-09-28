window.Utils = {
    formatTime: function(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return '--:--';
        const [hours, minutes] = timeStr.split(':');
        if (!hours || !minutes) return '--:--';
        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    },

    formatDate: function(date) {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        return new Date(date).toLocaleDateString('id-ID', options);
    },

    calculateDistance: function(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    toRadians: function(degrees) {
        return degrees * (Math.PI / 180);
    },

    calculateQiblaDirection: function(lat, lon) {
        const meccaLat = 21.4225;
        const meccaLon = 39.8262;
        const dLon = this.toRadians(meccaLon - lon);
        const latRad = this.toRadians(lat);
        const meccaLatRad = this.toRadians(meccaLat);
        const y = Math.sin(dLon) * Math.cos(meccaLatRad);
        const x = Math.cos(latRad) * Math.sin(meccaLatRad) -
            Math.sin(latRad) * Math.cos(meccaLatRad) * Math.cos(dLon);
        let bearing = Math.atan2(y, x);
        bearing = (bearing * 180 / Math.PI + 360) % 360;
        return bearing;
    },

    getMonthName: function(monthNum) {
        const months = [
            '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return months[parseInt(monthNum)];
    },

    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};