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

      // Clear and populate activities list
      // Reset activity select options (keep placeholder)
      if (activitySelect) {
        activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
      }

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
          participantsHtml = "<div class=\"participants\">";
          participantsHtml += signedUp
            .map((p) => {
              const display = formatDisplayName(p);
              const initials = display
                .split(" ")
                .map((s) => s.charAt(0))
                .slice(0, 2)
                .join("")
                .toUpperCase();
              // Add a delete button with data attributes for activity and email
              return `<div class="participant" data-email="${p}" data-activity="${encodeURIComponent(
                name
              )}"><span class="avatar">${initials}</span><span class="name" title="${p}">${display}</span><button class="participant-delete" title="Unregister" aria-label="Unregister ${p}">✕</button></div>`;
            })
            .join("");
          participantsHtml += "</div>";
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

        // Attach delegated click listener so delete buttons work after dynamic render
        // (We attach once on the container; ensure not to duplicate many listeners)

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Ensure we have a single delegated listener for delete clicks
      if (!activitiesList.dataset.deleteListenerAttached) {
        activitiesList.addEventListener("click", async (e) => {
          const btn = e.target.closest(".participant-delete");
          if (!btn) return;

          // Find containing .participant element
          const participantEl = btn.closest(".participant");
          if (!participantEl) return;

          const email = participantEl.dataset.email;
          const activity = decodeURIComponent(participantEl.dataset.activity || "");

          if (!email || !activity) return;

          try {
            const resp = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(
              email
            )}`, { method: "POST" });

            const result = await resp.json();
            if (resp.ok) {
              // Refresh the activities list to reflect changes
              fetchActivities();
            } else {
              console.error("Failed to unregister:", result);
              alert(result.detail || result.message || "Failed to unregister");
            }
          } catch (err) {
            console.error(err);
            alert("Failed to unregister. See console for details.");
          }
        });
        activitiesList.dataset.deleteListenerAttached = "true";
      }
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
        // Refresh activities to show updated participant list
        fetchActivities();
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
