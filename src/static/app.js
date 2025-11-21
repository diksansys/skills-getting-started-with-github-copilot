document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Replace the previous innerHTML block for activityCard with the following to include signed-up students list
        const formatDisplayName = (email) => {
          const local = String(email).split("@")[0] || email;
          return local
            .replace(/[\._]/g, " ")
            .split(" ")
            .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
            .join(" ");
        };

        // Treat details.participants as already signed-up students; filter out falsy values
        const signedUp = Array.isArray(details.participants) ? details.participants.filter(Boolean) : [];
        const signedCount = signedUp.length;

        let participantsHtml = "";
        if (signedCount > 0) {
          participantsHtml = "<ul class=\"participants\">";
          participantsHtml += signedUp
            .map((p) => {
              const display = formatDisplayName(p);
              const initials = display
                .split(" ")
                .map((s) => s.charAt(0))
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return `<li class="participant"><span class="avatar">${initials}</span><span class="name" title="${p}">${display}</span></li>`;
            })
            .join("");
          participantsHtml += "</ul>";
        } else {
          participantsHtml = `<p class="info">No students have signed up yet</p>`;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            <h5>Signed-up Students (${signedCount} / ${details.max_participants})</h5>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
